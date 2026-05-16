#!/usr/bin/env python3
"""Grade assertions for pod-discover iteration-2 eval.

Extends iter-1 grader with 3 new checks for post-substrate-cleanup state:
- recognized_capability_catalog (D83 capability catalog)
- class_iri_resolved (D79 Pod-local vocab dereference)
- no_phase_2_residue_reported (cleanup verification)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from grade import (
    check_fetched_root,
    check_discovered_storage_description,
    check_read_affordance_catalog,
    check_named_all_5_wiki_containers,
    check_named_4plus_wiki_classes,
    check_named_3plus_affordances,
    check_4plus_vocabularies,
    check_noticed_substrate_gap,
    check_no_hallucinated_urls,
)


def check_recognized_capability_catalog(transcript: str, response: str) -> tuple[bool, str]:
    # Combined transcript+response check: did the agent fetch /meta/capabilities/ AND mention capability/cap:?
    fetched = "/meta/capabilities/" in transcript or "/meta/capabilities" in transcript
    mentioned = bool(re.search(r"capabilit|cap:Capability|cap:DerivedView|cap:ContentProjection|cap:TimeTravel", response, re.I))
    if fetched and mentioned:
        return True, "fetched /meta/capabilities/ AND named cap:* descriptors"
    if fetched:
        return False, "fetched /meta/capabilities/ but didn't name any capability in response"
    if mentioned:
        return False, "mentioned capability/cap: in response but didn't fetch /meta/capabilities/"
    return False, "neither fetched nor mentioned capability catalog"


def check_class_iri_resolved(transcript: str, response: str) -> tuple[bool, str]:
    fetched_vocab = bool(re.search(r"ontology/wiki(\.ttl|#)", transcript))
    mentioned_iri = bool(re.search(r"http://pod\.vardeman\.me:3000/vault/ontology/wiki#|Pod-(hosted|local)\s+vocabular|wiki:\s*<http", response, re.I))
    if fetched_vocab or mentioned_iri:
        signals = []
        if fetched_vocab: signals.append("fetched wiki vocab")
        if mentioned_iri: signals.append("named wiki vocab IRI")
        return True, " + ".join(signals)
    return False, "agent didn't dereference or name wiki:* vocabulary IRI"


def check_no_phase_2_residue_reported(response: str) -> tuple[bool, str]:
    residues = []
    # Look for any leftover PARA paths the agent claims exist
    residue_patterns = [
        ("/resources/concepts/", r"/resources/concepts/"),
        ("/resources/literature/", r"/resources/literature/"),
        ("/procedures/shapes/", r"/procedures/shapes/"),
    ]
    for label, pat in residue_patterns:
        if re.search(pat, response):
            residues.append(label)
    if not residues:
        return True, "no PARA residue paths in response"
    return False, f"reported residue: {residues}"


def check_combined(name: str, fn, transcript: str, response: str) -> tuple[bool, str]:
    """Adapter for combined-source checks."""
    return fn(transcript, response)


ITER2_CHECKS = [
    ("fetched_root_or_any_url",          check_fetched_root,                       "transcript"),
    ("discovered_storage_description",   check_discovered_storage_description,     "transcript"),
    ("read_affordance_catalog",          check_read_affordance_catalog,            "transcript"),
    ("named_all_5_wiki_containers",      check_named_all_5_wiki_containers,        "response"),
    ("named_all_5_wiki_classes",         check_named_4plus_wiki_classes,           "response"),
    ("named_affordances",                check_named_3plus_affordances,            "response"),
    ("declared_vocabularies",            check_4plus_vocabularies,                 "response"),
    ("noticed_substrate_gap",            check_noticed_substrate_gap,              "response"),
    ("no_hallucinated_urls",             check_no_hallucinated_urls,               "transcript"),
    ("recognized_capability_catalog",    check_recognized_capability_catalog,      "combined"),
    ("class_iri_resolved",               check_class_iri_resolved,                 "combined"),
    ("no_phase_2_residue_reported",      check_no_phase_2_residue_reported,        "response"),
]


def grade_run(run_dir: Path) -> dict:
    response_path = run_dir / "outputs" / "agent-response.md"
    transcript_path = run_dir / "outputs" / "transcript.md"
    if not response_path.exists() or not transcript_path.exists():
        return {"expectations": [], "error": f"missing outputs in {run_dir}"}
    response = response_path.read_text()
    transcript = transcript_path.read_text()
    expectations = []
    for name, fn, source in ITER2_CHECKS:
        if source == "transcript":
            passed, evidence = fn(transcript)
        elif source == "response":
            passed, evidence = fn(response)
        else:  # combined
            passed, evidence = fn(transcript, response)
        expectations.append({"text": name, "passed": passed, "evidence": evidence})
    n_pass = sum(1 for e in expectations if e["passed"])
    n_total = len(expectations)
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
                         "/Users/cvardema/dev/git/LA3D/agents/solid-agent-skills/eval-workspace/pod-discover/iteration-2")
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
