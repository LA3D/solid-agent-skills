#!/usr/bin/env python3
"""Grade assertions for pod-discover iteration-1 eval.

Reads agent-response.md + transcript.md from each run dir, runs 9 assertion
checks, writes grading.json (with skill-creator's text/passed/evidence schema).

Usage: python grade.py <iteration-dir>
"""
import json
import re
import sys
from pathlib import Path


def check_fetched_root(transcript: str) -> tuple[bool, str]:
    # Agent fetched the Pod root or any vault URL — establishes contact
    if re.search(r"(GET|HEAD)\s+http://pod\.vardeman\.me:3000/vault/", transcript, re.I):
        m = re.search(r"((?:GET|HEAD)\s+http://pod\.vardeman\.me:3000/vault/[^\s|]*)", transcript, re.I)
        return True, m.group(1) if m else "matched"
    return False, "no request to /vault/ in transcript"


def check_discovered_storage_description(transcript: str) -> tuple[bool, str]:
    # Agent followed .well-known/solid (the storage description) per D44
    if ".well-known/solid" in transcript:
        m = re.search(r"((?:GET|HEAD)\s+\S*\.well-known/solid\S*)", transcript, re.I)
        return True, m.group(1) if m else "matched"
    return False, "no fetch of .well-known/solid"


def check_read_affordance_catalog(transcript: str) -> tuple[bool, str]:
    if "/meta/affordances" in transcript:
        m = re.search(r"((?:GET|HEAD)\s+\S*/meta/affordances\S*)", transcript, re.I)
        return True, m.group(1) if m else "matched"
    return False, "no fetch of /meta/affordances/"


def check_named_all_5_wiki_containers(response: str) -> tuple[bool, str]:
    needed = ["/wiki/pages/", "/wiki/sources/", "/wiki/people/", "/wiki/procedures/", "/wiki/working/"]
    missing = [n for n in needed if n not in response]
    if not missing:
        return True, "all 5 paths present"
    return False, f"missing: {missing}"


def check_named_4plus_wiki_classes(response: str) -> tuple[bool, str]:
    # Allow either wiki:Page or wiki:Concept (some agents may resolve via JSON-LD context aliasing)
    candidates = {
        "wiki:Page or wiki:Concept": ("wiki:Page" in response) or ("wiki:Concept" in response),
        "wiki:Source": "wiki:Source" in response,
        "wiki:Person": "wiki:Person" in response,
        "wiki:Procedure": "wiki:Procedure" in response,
        "wiki:WorkingNote": "wiki:WorkingNote" in response,
    }
    hits = [k for k, v in candidates.items() if v]
    if len(hits) >= 4:
        return True, f"{len(hits)}/5 wiki classes named: {hits}"
    return False, f"only {len(hits)}/5 wiki classes named: {hits}"


def check_named_3plus_affordances(response: str) -> tuple[bool, str]:
    # Look for affordance NAMES (the four descriptors). Case-insensitive on the keyword stems.
    names = {
        "markdown-projection": bool(re.search(r"markdown[-\s]projection", response, re.I)),
        "hub-view": bool(re.search(r"hub[-\s]view|wiki:Hub|hub\s+derivation", response, re.I)),
        "breadcrumb-view": bool(re.search(r"breadcrumb[-\s]view|breadcrumb", response, re.I)),
        "memento": bool(re.search(r"memento|RFC\s*7089|TimeMap|TimeGate", response, re.I)),
    }
    hits = [k for k, v in names.items() if v]
    if len(hits) >= 3:
        return True, f"{len(hits)}/4 affordances named: {hits}"
    return False, f"only {len(hits)}/4 affordances named: {hits}"


def check_4plus_vocabularies(response: str) -> tuple[bool, str]:
    # Check for both prefix names and IRIs to be charitable
    vocabs = {
        "SKOS": bool(re.search(r"\bSKOS\b|skos:", response)),
        "DCT/Dublin Core": bool(re.search(r"\bDCT\b|dct:|Dublin Core|dcterms?:", response, re.I)),
        "PROV": bool(re.search(r"\bPROV\b|prov:|PROV-O", response, re.I)),
        "CITO": bool(re.search(r"\bCITO\b|CiTO|cito:", response, re.I)),
        "FOAF": bool(re.search(r"\bFOAF\b|foaf:", response, re.I)),
        "wiki/vault local": bool(re.search(r"wiki:|vault:|urn:example:wiki", response)),
    }
    hits = [k for k, v in vocabs.items() if v]
    if len(hits) >= 4:
        return True, f"{len(hits)}/6 vocabularies named: {hits}"
    return False, f"only {len(hits)}/6 vocabularies named: {hits}"


def check_noticed_substrate_gap(response: str) -> tuple[bool, str]:
    type_index_drift = bool(re.search(
        r"(type\s*index.*(PARA|stale|drift|legacy|phase\s*2))|"
        r"((PARA|stale|drift|legacy|phase\s*2).*type\s*index)|"
        r"(phase[-\s]?2.*registrations?)",
        response, re.I))
    empty_shapes = bool(re.search(
        r"((shape\s*catalog|/meta/shapes).*empty)|"
        r"(empty.*(shape\s*catalog|/meta/shapes))|"
        r"(shape.*\.shacl\.ttl.*404)|"
        r"(\.shacl\.ttl.*404)|"
        r"(404.*shape)",
        response, re.I))
    if type_index_drift or empty_shapes:
        notes = []
        if type_index_drift: notes.append("type-index drift")
        if empty_shapes: notes.append("empty shape catalog / .shacl.ttl 404s")
        return True, f"identified: {', '.join(notes)}"
    return False, "neither substrate gap identified"


def check_no_hallucinated_urls(transcript: str) -> tuple[bool, str]:
    hallucinated_patterns = [
        r"/api/", r"/admin/", r"/data/", r"/dashboard/",
        r"/graphql", r"/v1/", r"/v2/", r"/rest/",
    ]
    hits = []
    for pat in hallucinated_patterns:
        if re.search(pat, transcript):
            hits.append(pat.strip("/"))
    if not hits:
        return True, "no invented paths found in transcript"
    return False, f"hallucinated paths: {hits}"


CHECKS = [
    ("fetched_root_or_any_url", check_fetched_root, "transcript"),
    ("discovered_storage_description", check_discovered_storage_description, "transcript"),
    ("read_affordance_catalog", check_read_affordance_catalog, "transcript"),
    ("named_all_5_wiki_containers", check_named_all_5_wiki_containers, "response"),
    ("named_all_5_wiki_classes", check_named_4plus_wiki_classes, "response"),
    ("named_affordances", check_named_3plus_affordances, "response"),
    ("declared_vocabularies", check_4plus_vocabularies, "response"),
    ("noticed_substrate_gap", check_noticed_substrate_gap, "response"),
    ("no_hallucinated_urls", check_no_hallucinated_urls, "transcript"),
]


def grade_run(run_dir: Path) -> dict:
    response_path = run_dir / "outputs" / "agent-response.md"
    transcript_path = run_dir / "outputs" / "transcript.md"
    if not response_path.exists() or not transcript_path.exists():
        return {"expectations": [], "error": f"missing outputs in {run_dir}"}
    response = response_path.read_text()
    transcript = transcript_path.read_text()
    expectations = []
    for name, fn, source in CHECKS:
        text = source == "transcript" and transcript or response
        passed, evidence = fn(text)
        expectations.append({"text": name, "passed": passed, "evidence": evidence})
    n_pass = sum(1 for e in expectations if e["passed"])
    n_total = len(expectations)
    # Read timing.json for tool_calls (aggregate_benchmark reads execution_metrics.total_tool_calls)
    timing_path = run_dir / "timing.json"
    tool_calls = 0
    if timing_path.exists():
        try:
            timing = json.loads(timing_path.read_text())
            tool_calls = timing.get("tool_uses", 0)
        except json.JSONDecodeError:
            pass
    return {
        "summary": {
            "pass_rate": n_pass / n_total if n_total else 0.0,
            "passed": n_pass,
            "failed": n_total - n_pass,
            "total": n_total,
        },
        "execution_metrics": {
            "total_tool_calls": tool_calls,
            "errors_encountered": 0,
        },
        "expectations": expectations,
    }


def main():
    iteration_dir = Path(sys.argv[1] if len(sys.argv) > 1 else
                         "/Users/cvardema/dev/git/LA3D/agents/solid-agent-skills/eval-workspace/pod-discover/iteration-1")
    eval_dir = iteration_dir / "eval-resource-type-discovery"
    summary = {}
    for arm in ("with_skill", "without_skill"):
        summary[arm] = {}
        for run_n in (1, 2, 3):
            run_dir = eval_dir / arm / f"run-{run_n}"
            result = grade_run(run_dir)
            (run_dir / "grading.json").write_text(json.dumps(result, indent=2))
            n_pass = sum(e["passed"] for e in result["expectations"])
            n_total = len(result["expectations"])
            summary[arm][f"run-{run_n}"] = f"{n_pass}/{n_total}"
            print(f"{arm}/run-{run_n}: {n_pass}/{n_total}")
    print()
    print("=== Summary ===")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
