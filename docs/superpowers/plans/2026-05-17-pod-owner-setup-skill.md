# Pod-Owner Setup Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `owner-identity` substrate overlay (cogitarelink-solid) and three agent-facing skills (solid-agent-skills) that orchestrate `solid-pod` CLI primitives to set up a Pod owner end-to-end, with agent↔human elicitation via `pim:preferencesFile` and follow-the-nose L1→L3 bridge discovery.

**Architecture:** Substrate first (vocab extension → shapes → templates → manifest → apply.py extension), then three skills bottom-up (addressbook → wiki-memory-l3 → owner-identity), then end-to-end verification. Each skill consumes only existing `solid-pod` CLI commands plus the new substrate-shipped templates/shapes.

**Tech Stack:** Python 3.12 (`~/uvws/.venv/bin/python`), pytest, pyshacl, rdflib, httpx, N3 patch. CSS v8 running on https://pod.vardeman.me (TLS). TypeScript CLI in solid-agent-skills (already compiled — not modified this sprint).

**Repos:**
- Substrate: `/Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid` (overlay + tests)
- Skills: `/Users/cvardema/dev/git/LA3D/agents/solid-agent-skills` (SKILL.md files only)

**Spec:** `solid-agent-skills/docs/superpowers/specs/2026-05-17-pod-owner-setup-skill-design.md`

---

## File Structure

### cogitarelink-solid (substrate)

| File | Status | Responsibility |
|---|---|---|
| `overlays/addressbook/vocabulary/template.ttl` | Modify (add 1 predicate) | Add `tmpl:targetResource` |
| `overlays/addressbook/capabilities/tmpl-vocabulary.ttl` | Modify (bump version) | Capability v1.0 → v1.1 |
| `overlays/owner-identity/manifest.ttl` | Create | Overlay manifest (D87 capabilities-only) |
| `overlays/owner-identity/vocabulary/owner-prefs.ttl` | Create | `prefs:` namespace (~30 lines) |
| `overlays/owner-identity/shapes/webid-profile.shacl.ttl` | Create | PodOwnerWebIDShape |
| `overlays/owner-identity/shapes/pod-owner-preferences.shacl.ttl` | Create | PodOwnerPreferencesShape |
| `overlays/owner-identity/templates/webid-enrich.ttl` | Create | PATCH template, `tmpl:targetResource` |
| `overlays/owner-identity/templates/prefs-init.ttl` | Create | PUT template, prefs skeleton |
| `overlays/owner-identity/capabilities/pod-owner-identity.ttl` | Create | Top-level capability |
| `overlays/owner-identity/capabilities/webid-profile-shape.ttl` | Create | Shape-pointer capability |
| `overlays/owner-identity/capabilities/pod-owner-preferences-shape.ttl` | Create | Shape-pointer capability |
| `overlays/owner-identity/capabilities/webid-enrich-template.ttl` | Create | Template-pointer capability |
| `overlays/owner-identity/capabilities/prefs-init-template.ttl` | Create | Template-pointer capability |
| `overlays/owner-identity/patches/profile-card-meta.ttl` | Create | `.meta` patch for `/vault/profile/card` |
| `scripts/overlay/common.py` | Modify | Parse `installsResourceMetaPatch` predicate |
| `scripts/overlay/apply.py` | Modify (add step 11b) | Apply resource `.meta` patches |
| `tests/test_owner_identity_vocab.py` | Create | `prefs:` namespace tests |
| `tests/test_owner_identity_shapes.py` | Create | Shape conformance tests |
| `tests/test_owner_identity_templates.py` | Create | Template parse + SHACL roundtrip tests |
| `tests/test_overlay_resource_meta_patch.py` | Create | Manifest-parser test for new predicate |
| `tests/integration/test_owner_identity_e2e.py` | Create | End-to-end against live Pod |

### solid-agent-skills (skills)

| File | Status | Responsibility |
|---|---|---|
| `skills/solid-addressbook/SKILL.md` | Create | AddressBook agent skill |
| `skills/solid-wiki-memory-l3/SKILL.md` | Create | Wiki-memory L3 agent skill (minimal scope) |
| `skills/solid-owner-identity/SKILL.md` | Create | Pod-owner identity + setup orchestration |

---

## Conventions used throughout this plan

- **Python**: `~/uvws/.venv/bin/python` (project's global uv venv per CLAUDE.md). Run tests as `~/uvws/.venv/bin/python -m pytest <path> -v`.
- **TLS Pod URL**: `https://pod.vardeman.me/vault/` (test env). Test code uses `httpx.Client(verify=False)` per existing pattern (mkcert root CA per D85).
- **Commit format**: `[Agent: Claude] <type>: <short summary>` with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` per project CLAUDE.md. Stage specific files (never `git add -A`).
- **`cd`**: avoid; prefer absolute paths. When unavoidable, `cd <abs-path>` only at start of a multi-step compound bash command.
- **Pod live-ness**: substrate tests in Parts 1-5 mostly run offline (rdflib + pyshacl). Integration tests (Part 5 final, Part 8 final) require `docker compose up -d` in the cogitarelink-solid repo.

---

# Part 1 — Substrate vocab extension

## Task 1: Add `tmpl:targetResource` predicate

**Files:**
- Modify: `cogitarelink-solid/overlays/addressbook/vocabulary/template.ttl` (append predicate)
- Modify: `cogitarelink-solid/overlays/addressbook/capabilities/tmpl-vocabulary.ttl` (bump `cap:version`)
- Modify: `cogitarelink-solid/tests/test_addressbook_vocab.py` (extend assertion list)

- [ ] **Step 1.1: Extend the existing vocab test to require the new predicate**

Edit `cogitarelink-solid/tests/test_addressbook_vocab.py`. Add `TMPL.targetResource` to the `expected_terms` list inside `test_template_vocab_defines_required_terms`:

```python
expected_terms = [
    TMPL.Template, TMPL.validatesAgainst, TMPL.operation,
    TMPL.targetContainer, TMPL.slugAlgorithm, TMPL.templateBody,
    TMPL.targetResource,   # NEW v1.1 — for PATCH templates
]
```

- [ ] **Step 1.2: Run the test, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_addressbook_vocab.py::test_template_vocab_defines_required_terms -v
```

Expected: `AssertionError: Missing definition for https://pod.vardeman.me/vault/ontology/template#targetResource`

- [ ] **Step 1.3: Add the predicate to template.ttl**

Append to `cogitarelink-solid/overlays/addressbook/vocabulary/template.ttl`:

```turtle
tmpl:targetResource
    a rdf:Property ;
    rdfs:label "target resource" ;
    rdfs:comment "The specific resource (not container) a filled template is applied to. Used for PATCH templates that operate on an existing resource rather than creating a new one under a container. Exactly one of tmpl:targetContainer or tmpl:targetResource must be present on a Template; never both." ;
    rdfs:domain tmpl:Template ;
    rdfs:range  rdfs:Resource .
```

- [ ] **Step 1.4: Run the test, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_addressbook_vocab.py -v
```

Expected: 1 passed.

- [ ] **Step 1.5: Bump tmpl-vocabulary capability to v1.1**

Edit `cogitarelink-solid/overlays/addressbook/capabilities/tmpl-vocabulary.ttl` — change `cap:version "1.0"` to `cap:version "1.1"` and amend the `rdfs:comment` to add this sentence:

> "v1.1 (2026-05-17): adds tmpl:targetResource for PATCH templates operating on existing resources (consumed by owner-identity overlay)."

- [ ] **Step 1.6: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/addressbook/vocabulary/template.ttl overlays/addressbook/capabilities/tmpl-vocabulary.ttl tests/test_addressbook_vocab.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] tmpl: add targetResource predicate for PATCH templates

Bumps tmpl-vocabulary capability to v1.1. Consumed by owner-identity
overlay (next commits) — webid-enrich is the first PATCH template and
targets /vault/profile/card directly rather than a container.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

# Part 2 — owner-identity overlay scaffold

## Task 2: Create overlay directory layout

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/` (directory tree)

- [ ] **Step 2.1: Create directory tree**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
mkdir -p overlays/owner-identity/{shapes,templates,capabilities,vocabulary,patches}
ls overlays/owner-identity/
```

Expected output: `capabilities  patches  shapes  templates  vocabulary`

No commit yet — empty directories aren't tracked by git. Tasks 3-9 fill them.

---

## Task 3: Create `prefs:` vocabulary

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/vocabulary/owner-prefs.ttl`
- Create: `cogitarelink-solid/tests/test_owner_identity_vocab.py`

- [ ] **Step 3.1: Write failing test**

Create `cogitarelink-solid/tests/test_owner_identity_vocab.py`:

```python
"""prefs: vocabulary parses and defines required terms."""
from rdflib import Graph, Namespace

PREFS = Namespace("https://pod.vardeman.me/vault/ontology/owner-prefs#")
RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#")


def test_owner_prefs_vocab_defines_required_terms():
    g = Graph().parse(
        "overlays/owner-identity/vocabulary/owner-prefs.ttl",
        format="turtle",
    )
    expected = [
        PREFS.PodOwnerPreferences,
        PREFS.fullName,
        PREFS.orcid,
        PREFS.wikiSlug,
        PREFS.primaryAffiliationROR,
        PREFS.primaryAffiliationName,
        PREFS.membershipRole,
        PREFS.membershipStart,
        PREFS.email,
        PREFS.foafImg,
        PREFS.setupOwnerCompleted,
    ]
    for term in expected:
        assert (term, None, None) in g, f"Missing definition for {term}"
        labels = list(g.objects(term, RDFS.label))
        assert labels, f"Missing rdfs:label for {term}"
```

- [ ] **Step 3.2: Run test, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_vocab.py -v
```

Expected: `FileNotFoundError` (file not yet present).

- [ ] **Step 3.3: Create the vocabulary file**

Create `cogitarelink-solid/overlays/owner-identity/vocabulary/owner-prefs.ttl`:

```turtle
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
@prefix dct:   <http://purl.org/dc/terms/> .

<https://pod.vardeman.me/vault/ontology/owner-prefs>
    a owl:Ontology ;
    rdfs:label "Pod-owner Preferences Vocabulary" ;
    rdfs:comment "Predicates for the per-Pod-owner preferences resource at /vault/settings/prefs.ttl. Used by the agent<->human elicitation flow that drives WebID enrichment + AddressBook owner card." ;
    dct:created "2026-05-17"^^xsd:date .

prefs:PodOwnerPreferences a rdfs:Class ;
    rdfs:label "Pod-Owner Preferences" ;
    rdfs:comment "A preferences record describing the Pod owner. Validated by PodOwnerPreferencesShape." .

prefs:fullName a rdf:Property ;
    rdfs:label "full name" ;
    rdfs:comment "Display name of the Pod owner (e.g., \"Charles F. Vardeman II\")." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:orcid a rdf:Property ;
    rdfs:label "ORCID" ;
    rdfs:comment "Bare ORCID id (no URI prefix), pattern XXXX-XXXX-XXXX-XXXX." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:wikiSlug a rdf:Property ;
    rdfs:label "wiki slug" ;
    rdfs:comment "Desired slug under /vault/wiki/people/<slug>/ for the agentic-memory page." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:primaryAffiliationROR a rdf:Property ;
    rdfs:label "primary affiliation ROR" ;
    rdfs:comment "Bare ROR id of current primary organizational affiliation." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:primaryAffiliationName a rdf:Property ;
    rdfs:label "primary affiliation name" ;
    rdfs:comment "Display name of primary affiliation (fallback when no ROR exists)." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:membershipRole a rdf:Property ;
    rdfs:label "membership role" ;
    rdfs:comment "Role at primary affiliation (e.g., \"Research Assistant Professor\")." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:membershipStart a rdf:Property ;
    rdfs:label "membership start date" ;
    rdfs:comment "Start date of primary membership (xsd:date)." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:date .

prefs:email a rdf:Property ;
    rdfs:label "email" ;
    rdfs:comment "Owner's primary email (no mailto: prefix; the contact card adds it)." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:string .

prefs:foafImg a rdf:Property ;
    rdfs:label "avatar URL" ;
    rdfs:comment "Avatar URL (becomes foaf:img on the WebID)." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:anyURI .

prefs:setupOwnerCompleted a rdf:Property ;
    rdfs:label "setup-owner completed" ;
    rdfs:comment "Boolean marker — true once the cross-cutting SetupPodOwner flow has completed end-to-end. Read by setup-owner to short-circuit re-runs." ;
    rdfs:domain prefs:PodOwnerPreferences ; rdfs:range xsd:boolean .
```

- [ ] **Step 3.4: Run test, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_vocab.py -v
```

Expected: 1 passed.

- [ ] **Step 3.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/vocabulary/owner-prefs.ttl tests/test_owner_identity_vocab.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: prefs: vocabulary (11 terms)

Predicates for /vault/settings/prefs.ttl — the agent<->human elicitation
scratchpad that drives WebID enrichment + AddressBook owner card. D90
candidate (pim:preferencesFile as substrate-supported elicitation surface).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

# Part 3 — Shapes

## Task 4: `PodOwnerPreferencesShape`

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/shapes/pod-owner-preferences.shacl.ttl`
- Create: `cogitarelink-solid/tests/test_owner_identity_shapes.py`

- [ ] **Step 4.1: Write failing test (valid prefs + missing-orcid + bad-orcid-pattern)**

Create `cogitarelink-solid/tests/test_owner_identity_shapes.py`:

```python
"""SHACL conformance tests for owner-identity shapes."""
from pathlib import Path
import pytest
from rdflib import Graph
from pyshacl import validate

SHAPES_DIR = Path(__file__).parent.parent / "overlays" / "owner-identity" / "shapes"
_BASE = "https://pod.vardeman.me/vault/"


def load_shapes(filename: str) -> Graph:
    return Graph().parse(SHAPES_DIR / filename, format="turtle", publicID=_BASE + "meta/shapes/" + filename)


# ----- PodOwnerPreferencesShape -----

PREFS_VALID = """
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .

</vault/settings/prefs.ttl#owner> a prefs:PodOwnerPreferences ;
    prefs:fullName "Charles F. Vardeman II" ;
    prefs:orcid    "0000-0003-4091-6059" ;
    prefs:wikiSlug "charles" .
"""

PREFS_MISSING_ORCID = """
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .

</vault/settings/prefs.ttl#owner> a prefs:PodOwnerPreferences ;
    prefs:fullName "Charles F. Vardeman II" ;
    prefs:wikiSlug "charles" .
"""

PREFS_BAD_ORCID = """
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .

</vault/settings/prefs.ttl#owner> a prefs:PodOwnerPreferences ;
    prefs:fullName "X" ;
    prefs:orcid    "not-an-orcid" ;
    prefs:wikiSlug "x" .
"""


def _validate(prefs_ttl: str):
    shapes_g = load_shapes("pod-owner-preferences.shacl.ttl")
    data_g = Graph().parse(data=prefs_ttl, format="turtle", publicID=_BASE)
    conforms, _, report_text = validate(
        data_graph=data_g, shacl_graph=shapes_g,
        inference="rdfs", debug=False,
    )
    return conforms, report_text


def test_prefs_valid_conforms():
    conforms, report = _validate(PREFS_VALID)
    assert conforms, f"Valid prefs failed: {report}"


def test_prefs_missing_orcid_fails():
    conforms, report = _validate(PREFS_MISSING_ORCID)
    assert not conforms
    assert "orcid" in report.lower()


def test_prefs_bad_orcid_pattern_fails():
    conforms, report = _validate(PREFS_BAD_ORCID)
    assert not conforms
    assert "orcid" in report.lower() or "pattern" in report.lower()
```

- [ ] **Step 4.2: Run, expect FAIL (file not found)**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_shapes.py -v
```

Expected: 3 errors (FileNotFoundError on the shape).

- [ ] **Step 4.3: Create the shape**

Create `cogitarelink-solid/overlays/owner-identity/shapes/pod-owner-preferences.shacl.ttl`:

```turtle
@prefix sh:    <http://www.w3.org/ns/shacl#> .
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
@prefix dct:   <http://purl.org/dc/terms/> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .

<#PodOwnerPreferencesShape>
    a sh:NodeShape ;
    sh:targetNode </vault/settings/prefs.ttl#owner> ;
    dct:conformsTo <https://www.w3.org/TR/shacl/> ;
    sh:agentInstruction """
      The Pod-owner preferences file at /vault/settings/prefs.ttl is the
      scratchpad where the AGENT WALKS THE HUMAN through setup. Required
      facts to elicit (ask one at a time, persist after each answer):

        prefs:fullName  — full display name
        prefs:orcid     — bare ORCID id (XXXX-XXXX-XXXX-XXXX)
        prefs:wikiSlug  — desired slug for /vault/wiki/people/<slug>/

      Optional facts (elicit but don't block on):
        prefs:primaryAffiliationROR / Name, prefs:membershipRole,
        prefs:membershipStart, prefs:additionalAffiliations,
        prefs:email, prefs:foafImg.

      Set prefs:setupOwnerCompleted true^^xsd:boolean when the full
      SetupPodOwner flow completes so re-runs short-circuit.

      The prefs file is private (post-ACL: acl:owner-only). Treat its
      contents as the owner's authoritative self-declaration. Don't
      substitute facts gathered from CLAUDE.md or other sources without
      confirming with the human.
    """ ;
    sh:property [ sh:path prefs:fullName ;
                  sh:minCount 1 ; sh:datatype xsd:string ;
                  sh:message "Need full display name — ask the human." ] ;
    sh:property [ sh:path prefs:orcid ;
                  sh:minCount 1 ; sh:datatype xsd:string ;
                  sh:pattern "^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$" ;
                  sh:message "Need bare ORCID id (XXXX-XXXX-XXXX-XXXX) — ask the human." ] ;
    sh:property [ sh:path prefs:wikiSlug ;
                  sh:minCount 1 ; sh:datatype xsd:string ;
                  sh:pattern "^[a-z0-9-]+$" ;
                  sh:message "Need wiki slug (lowercase + hyphens) — suggest from fullName, confirm with human." ] ;
    sh:property [ sh:path prefs:setupOwnerCompleted ;
                  sh:maxCount 1 ; sh:datatype xsd:boolean ;
                  sh:severity sh:Info ] ;
    sh:closed false .
```

- [ ] **Step 4.4: Run, expect PASS (3 tests)**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_shapes.py -v
```

Expected: 3 passed.

- [ ] **Step 4.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/shapes/pod-owner-preferences.shacl.ttl tests/test_owner_identity_shapes.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: PodOwnerPreferencesShape

Elicitation contract for /vault/settings/prefs.ttl — three required facts
(fullName/orcid/wikiSlug with regex patterns) + optional affiliations +
completion marker. sh:agentInstruction documents the one-question-at-a-time
walk-through protocol.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `PodOwnerWebIDShape`

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/shapes/webid-profile.shacl.ttl`
- Modify: `cogitarelink-solid/tests/test_owner_identity_shapes.py` (append WebID test cases)

- [ ] **Step 5.1: Append failing tests**

Append to `cogitarelink-solid/tests/test_owner_identity_shapes.py`:

```python
# ----- PodOwnerWebIDShape -----

WEBID_VALID_ENRICHED = """
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix pim:   <http://www.w3.org/ns/pim/space#> .

</vault/profile/card#me>
    a foaf:Agent, foaf:Person ;
    foaf:name              "Charles F. Vardeman II" ;
    solid:oidcIssuer       <https://pod.vardeman.me/> ;
    pim:storage            <https://pod.vardeman.me/vault/> ;
    pim:preferencesFile    </vault/settings/prefs.ttl> ;
    solid:publicTypeIndex  </vault/settings/publicTypeIndex> ;
    owl:sameAs             <https://orcid.org/0000-0003-4091-6059> ,
                           </vault/contacts/Person/abc-uuid.ttl#this> ;
    foaf:isPrimaryTopicOf  </vault/wiki/people/charles/index.md> .
"""

WEBID_CSS_DEFAULT_MISSING_MUSTS = """
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix pim:   <http://www.w3.org/ns/pim/space#> .

</vault/profile/card#me>
    a foaf:Person ;
    solid:oidcIssuer       <https://pod.vardeman.me/> ;
    pim:storage            <https://pod.vardeman.me/vault/> ;
    solid:publicTypeIndex  </vault/settings/publicTypeIndex> .
"""


def _validate_webid(ttl: str):
    shapes_g = load_shapes("webid-profile.shacl.ttl")
    data_g = Graph().parse(data=ttl, format="turtle", publicID=_BASE)
    conforms, _, report_text = validate(
        data_graph=data_g, shacl_graph=shapes_g,
        inference="rdfs", debug=False,
    )
    return conforms, report_text


def test_webid_valid_enriched_conforms():
    conforms, report = _validate_webid(WEBID_VALID_ENRICHED)
    assert conforms, f"Enriched WebID failed: {report}"


def test_webid_css_default_fails_on_missing_musts():
    # Missing foaf:Agent type and pim:preferencesFile (both spec MUSTs)
    conforms, report = _validate_webid(WEBID_CSS_DEFAULT_MISSING_MUSTS)
    assert not conforms
    # foaf:Agent missing AND/OR pim:preferencesFile missing
    assert "agent" in report.lower() or "preferencesfile" in report.lower()
```

- [ ] **Step 5.2: Run, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_shapes.py::test_webid_valid_enriched_conforms cogitarelink-solid/tests/test_owner_identity_shapes.py::test_webid_css_default_fails_on_missing_musts -v
```

Expected: FileNotFoundError on shape.

- [ ] **Step 5.3: Create the WebID shape**

Create `cogitarelink-solid/overlays/owner-identity/shapes/webid-profile.shacl.ttl`:

```turtle
@prefix sh:    <http://www.w3.org/ns/shacl#> .
@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix org:   <http://www.w3.org/ns/org#> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix pim:   <http://www.w3.org/ns/pim/space#> .
@prefix wiki:  <https://pod.vardeman.me/vault/ontology/wiki#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct:   <http://purl.org/dc/terms/> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .

<#PodOwnerWebIDShape>
    a sh:NodeShape ;
    sh:targetNode </vault/profile/card#me> ;
    dct:conformsTo <https://solid.github.io/webid-profile/> ;
    sh:agentInstruction """
      Governs the Pod-owner WebID at /vault/profile/card#me.
      Grounded in: W3C WebID 1.0 + Solid WebID Profile editor draft
      (https://solid.github.io/webid-profile/).

      Three-layer Pod-owner identity model:
        L1 — this WebID profile (canonical identity, auth, spec-required).
        L2 — AddressBook contact card at /vault/contacts/Person/<uuid>.ttl#this
             (operational identity — vcard predicates, time-scoped affiliations,
              SolidOS-compatible).
        L3 — wiki person page at /vault/wiki/people/<slug>/index.md
             (AGENTIC MEMORY — deep semantic context for LLMs, concept-edges,
              sources, narrative). foaf:isPrimaryTopicOf bridges L1->L3; the
              linked page is asserted `a wiki:Person` in the same response so
              a single dereference is sufficient for an LLM to follow-its-nose
              from WebID to agentic memory.

      Setup-owner workflow (cross-overlay; see solid-owner-identity skill):
        1. Check /vault/settings/prefs.ttl — if missing/incomplete, walk
           human through elicitation, persist to prefs.ttl as you go.
        2. Build AddressBook Person card (and optional Org + Membership)
           from prefs.
        3. (Optional) create /vault/wiki/people/<slug>/ wiki page; in its
           .meta assert foaf:primaryTopic <this WebID>.
        4. Fill the webid-enrich template from prefs + AddressBook URIs +
           optional wiki page URI, PATCH /vault/profile/card.

      MUST (spec-mandated — sh:Violation):
        rdf:type foaf:Agent              (Solid WebID Profile §3.1, exactly 1)
        pim:preferencesFile              (Solid WebID Profile §4, exactly 1)

      MUST (operationally required — sh:Violation):
        solid:oidcIssuer (>=1, PROTECTED — never PATCH; CSS owns it per §3.2)
        pim:storage (>=1; spec is 0+ but Pod-owner case requires >=1)
        solid:publicTypeIndex (1; needed for wiki-memory L3 class-based dispatch per D78)

      SHOULD — enrichment (sh:Warning, doesn't block writes):
        rdf:type foaf:Person (CSS-default omits foaf:Agent; we assert both)
        foaf:name (>=1, xsd:string)
        owl:sameAs <https://orcid.org/...> (>=1; spec-endorsed bridge §3.3)
        owl:sameAs </vault/contacts/Person/<uuid>.ttl#this> (>=1; L1<->L2 equivalence)
        foaf:isPrimaryTopicOf </vault/wiki/people/<slug>/index.md> (>=1; L1->L3 bridge)

      MAY — rich identity (sh:Info):
        org:hasMembership (0+; time-scoped affiliations from AddressBook)
        foaf:img, foaf:nick, foaf:mbox
        rdfs:seeAlso (spec-endorsed generic fallback)

      FUTURE EXTENSION POINTS (commented MAY in v1; sharpened in later sprints):
        cred:credentialSubject — VC claims about the WebID owner (W3C VC 2.0)
        alsoKnownAs <did:...>  — DID-WebID bridge (D14)
        acl:owner              — when Phase 6 enables WAC/ACP
        solid:account          — multi-WebID Pods (lab/org Pod with members)
    """ ;

    # MUST — spec-mandated
    sh:property [ sh:path rdf:type ; sh:hasValue foaf:Agent ; sh:minCount 1 ;
                  sh:message "Solid WebID Profile §3.1 requires rdf:type foaf:Agent (CSS-default omits this — enrichment adds it)." ] ;
    sh:property [ sh:path pim:preferencesFile ; sh:minCount 1 ; sh:maxCount 1 ; sh:nodeKind sh:IRI ;
                  sh:message "Solid WebID Profile §4 requires exactly one pim:preferencesFile (CSS-default omits — setup-owner mints /vault/settings/prefs.ttl)." ] ;

    # MUST — operationally required for Pod-owner
    sh:property [ sh:path solid:oidcIssuer ; sh:minCount 1 ; sh:nodeKind sh:IRI ;
                  sh:message "Solid WebID Profile §3.2 PROTECTED triple — CSS mints, never PATCH." ] ;
    sh:property [ sh:path pim:storage ; sh:minCount 1 ; sh:nodeKind sh:IRI ] ;
    sh:property [ sh:path solid:publicTypeIndex ; sh:minCount 1 ; sh:maxCount 1 ; sh:nodeKind sh:IRI ] ;

    # SHOULD — enrichment (sh:Warning)
    sh:property [ sh:path rdf:type ; sh:hasValue foaf:Person ; sh:severity sh:Warning ;
                  sh:message "SHOULD assert foaf:Person alongside foaf:Agent (most Pod owners are persons)." ] ;
    sh:property [ sh:path foaf:name ; sh:minCount 1 ; sh:datatype xsd:string ; sh:severity sh:Warning ] ;
    sh:property [ sh:path owl:sameAs ; sh:minCount 1 ; sh:nodeKind sh:IRI ; sh:severity sh:Warning ;
                  sh:message "WebID SHOULD owl:sameAs at least one canonical anchor (ORCID + AddressBook contact-card #this)." ] ;
    sh:property [ sh:path foaf:isPrimaryTopicOf ; sh:minCount 1 ; sh:nodeKind sh:IRI ; sh:severity sh:Warning ;
                  sh:message "WebID SHOULD foaf:isPrimaryTopicOf the wiki person page — the L3 agentic-memory record providing deep semantic context (wiki:Person, asserted in same response for single-dereference discovery)." ] ;

    # MAY — informational
    sh:property [ sh:path org:hasMembership ; sh:nodeKind sh:IRI ; sh:severity sh:Info ] ;

    sh:closed false .
```

- [ ] **Step 5.4: Run, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_shapes.py -v
```

Expected: 5 passed (3 prefs + 2 WebID).

- [ ] **Step 5.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/shapes/webid-profile.shacl.ttl tests/test_owner_identity_shapes.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: PodOwnerWebIDShape

Spec-grounded WebID profile shape — MUST predicates from Solid WebID
Profile editor draft (foaf:Agent + pim:preferencesFile) as sh:Violation,
operational MUSTs (oidcIssuer/storage/publicTypeIndex) also sh:Violation,
SHOULD enrichments (foaf:name, owl:sameAs ORCID + L2, foaf:isPrimaryTopicOf
L3) as sh:Warning so partial enrichment doesn't block. Forward extension
points (VC/DID/ACL) documented in sh:agentInstruction.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

# Part 4 — Templates

## Task 6: `prefs-init.ttl` template

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/templates/prefs-init.ttl`
- Create: `cogitarelink-solid/tests/test_owner_identity_templates.py`

- [ ] **Step 6.1: Write failing test (parse + body parses + skeleton conforms after fills)**

Create `cogitarelink-solid/tests/test_owner_identity_templates.py`:

```python
"""owner-identity templates parse and produce shape-conforming bodies."""
from pathlib import Path
from rdflib import Graph, Namespace
from pyshacl import validate

TMPL_DIR   = Path(__file__).parent.parent / "overlays" / "owner-identity" / "templates"
SHAPES_DIR = Path(__file__).parent.parent / "overlays" / "owner-identity" / "shapes"
TMPL = Namespace("https://pod.vardeman.me/vault/ontology/template#")

_BASE = "https://pod.vardeman.me/vault/"

PLACEHOLDERS = {
    "<<FULL_NAME>>":     "Charles F. Vardeman II",
    "<<ORCID>>":         "0000-0003-4091-6059",
    "<<WIKI_SLUG>>":     "charles",
    "<<CONTACT_CARD>>":  "/vault/contacts/Person/abc-uuid.ttl#this",
    "<<WIKI_PAGE>>":     "/vault/wiki/people/charles/index.md",
    "<<MEMBERSHIP>>":    "/vault/contacts/Membership/xyz-uuid.ttl#this",
}


def _substitute(body: str) -> str:
    for k, v in PLACEHOLDERS.items():
        body = body.replace(k, v)
    return body


def _strip_comments(body: str) -> str:
    """Drop comment-only lines (those starting with # after optional whitespace)."""
    keep = []
    for line in body.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("#"):
            continue
        keep.append(line)
    return "\n".join(keep)


def test_prefs_init_parses():
    g = Graph().parse(TMPL_DIR / "prefs-init.ttl", format="turtle", publicID=_BASE)
    # Template MUST declare operation + targetResource (no targetContainer)
    body = list(g.objects(predicate=TMPL.templateBody))
    assert body, "prefs-init.ttl missing tmpl:templateBody"
    op = list(g.objects(predicate=TMPL.operation))
    assert op and str(op[0]) == "PUT", f"prefs-init operation should be PUT, got {op}"
    target = list(g.objects(predicate=TMPL.targetResource))
    assert target, "prefs-init missing tmpl:targetResource"
    container = list(g.objects(predicate=TMPL.targetContainer))
    assert not container, "prefs-init must NOT have tmpl:targetContainer (PATCH+resource flavor)"


def test_prefs_init_body_parses_as_turtle():
    g = Graph().parse(TMPL_DIR / "prefs-init.ttl", format="turtle", publicID=_BASE)
    body = str(list(g.objects(predicate=TMPL.templateBody))[0])
    # The body is a SKELETON with commented-out fields — should parse as empty-ish Turtle.
    Graph().parse(data=body, format="turtle", publicID=_BASE + "settings/prefs.ttl")  # raises if invalid
```

- [ ] **Step 6.2: Run, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_templates.py -v
```

Expected: FileNotFoundError.

- [ ] **Step 6.3: Create the template**

Create `cogitarelink-solid/overlays/owner-identity/templates/prefs-init.ttl`:

```turtle
@prefix tmpl: <https://pod.vardeman.me/vault/ontology/template#> .
@prefix sh:   <http://www.w3.org/ns/shacl#> .

</vault/meta/templates/prefs-init.ttl>
    a tmpl:Template ;
    tmpl:validatesAgainst </vault/meta/shapes/pod-owner-preferences.shacl.ttl#PodOwnerPreferencesShape> ;
    tmpl:operation       "PUT" ;
    tmpl:targetResource  </vault/settings/prefs.ttl> ;
    sh:agentInstruction """
      Create the empty preferences-file skeleton at /vault/settings/prefs.ttl.

      1. Substitute no placeholders for the skeleton itself — PUT as-is.
      2. After PUT succeeds, walk the human through the REQUIRED facts one
         at a time:  prefs:fullName, prefs:orcid, prefs:wikiSlug.
         For each answer, solid-pod patch /vault/settings/prefs.ttl
         --insert "<#owner> prefs:X \\"...\\" ." .
      3. Optionally walk through OPTIONAL facts (affiliation, email, etc.).
         Accept "skip" from the human.
      4. Validate against PodOwnerPreferencesShape before proceeding to the
         AddressBook + WebID enrichment phases.
      5. When the full SetupPodOwner flow completes, patch
         <#owner> prefs:setupOwnerCompleted true^^xsd:boolean .
    """ ;
    tmpl:templateBody """
@prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .

</vault/settings/prefs.ttl#owner>
    a prefs:PodOwnerPreferences .

# REQUIRED — elicit from human one at a time, then PATCH this resource:
#   <#owner> prefs:fullName  \"...\" .
#   <#owner> prefs:orcid     \"XXXX-XXXX-XXXX-XXXX\" .
#   <#owner> prefs:wikiSlug  \"...\" .
# OPTIONAL:
#   <#owner> prefs:primaryAffiliationROR  \"...\" .
#   <#owner> prefs:primaryAffiliationName \"...\" .
#   <#owner> prefs:membershipRole         \"...\" .
#   <#owner> prefs:membershipStart        \"YYYY-MM-DD\"^^xsd:date .
#   <#owner> prefs:email                  \"...\" .
#   <#owner> prefs:foafImg                \"https://...\" .
# COMPLETION MARKER:
#   <#owner> prefs:setupOwnerCompleted true^^xsd:boolean .
""" .
```

- [ ] **Step 6.4: Run, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_templates.py -v
```

Expected: 2 passed.

- [ ] **Step 6.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/templates/prefs-init.ttl tests/test_owner_identity_templates.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: prefs-init.ttl template (first tmpl:targetResource consumer)

PUT-flavor template that creates the empty /vault/settings/prefs.ttl skeleton.
First substrate consumer of tmpl:targetResource (v1.1 vocab predicate).
sh:agentInstruction documents the one-question-at-a-time walk-through.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `webid-enrich.ttl` template

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/templates/webid-enrich.ttl`
- Modify: `cogitarelink-solid/tests/test_owner_identity_templates.py` (append tests)

- [ ] **Step 7.1: Append failing tests**

Append to `cogitarelink-solid/tests/test_owner_identity_templates.py`:

```python
def test_webid_enrich_parses():
    g = Graph().parse(TMPL_DIR / "webid-enrich.ttl", format="turtle", publicID=_BASE)
    op = list(g.objects(predicate=TMPL.operation))
    assert op and str(op[0]) == "PATCH", f"webid-enrich operation should be PATCH, got {op}"
    target = list(g.objects(predicate=TMPL.targetResource))
    assert target and str(target[0]).endswith("/profile/card"), f"webid-enrich targetResource should be profile/card, got {target}"


def test_webid_enrich_filled_body_conforms_to_webid_shape():
    g = Graph().parse(TMPL_DIR / "webid-enrich.ttl", format="turtle", publicID=_BASE)
    body = str(list(g.objects(predicate=TMPL.templateBody))[0])
    filled = _strip_comments(_substitute(body))

    # Simulate the result of applying the patch to a CSS-default minimal profile.
    # CSS already provides oidcIssuer / storage / publicTypeIndex / foaf:Person.
    css_minimal = """
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix pim: <http://www.w3.org/ns/pim/space#> .
</vault/profile/card#me>
    a foaf:Person ;
    solid:oidcIssuer <https://pod.vardeman.me/> ;
    pim:storage <https://pod.vardeman.me/vault/> ;
    solid:publicTypeIndex </vault/settings/publicTypeIndex> .
"""
    data_g = Graph()
    data_g.parse(data=css_minimal, format="turtle", publicID=_BASE)
    data_g.parse(data=filled,      format="turtle", publicID=_BASE)

    shapes_g = Graph().parse(SHAPES_DIR / "webid-profile.shacl.ttl", format="turtle", publicID=_BASE + "meta/shapes/webid-profile.shacl.ttl")
    conforms, _, report = validate(
        data_graph=data_g, shacl_graph=shapes_g, inference="rdfs", debug=False,
    )
    assert conforms, f"Filled webid-enrich body did NOT conform to PodOwnerWebIDShape:\n{report}"
```

- [ ] **Step 7.2: Run, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_templates.py::test_webid_enrich_parses cogitarelink-solid/tests/test_owner_identity_templates.py::test_webid_enrich_filled_body_conforms_to_webid_shape -v
```

Expected: FileNotFoundError.

- [ ] **Step 7.3: Create the template**

Create `cogitarelink-solid/overlays/owner-identity/templates/webid-enrich.ttl`:

```turtle
@prefix tmpl: <https://pod.vardeman.me/vault/ontology/template#> .
@prefix sh:   <http://www.w3.org/ns/shacl#> .

</vault/meta/templates/webid-enrich.ttl>
    a tmpl:Template ;
    tmpl:validatesAgainst </vault/meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape> ;
    tmpl:operation       "PATCH" ;
    tmpl:targetResource  </vault/profile/card> ;
    sh:agentInstruction """
      Enrich the Pod-owner WebID profile at /vault/profile/card.

      Placeholders:
        <<FULL_NAME>>     — display name (e.g., "Charles F. Vardeman II")
        <<ORCID>>         — bare ORCID id (e.g., "0000-0003-4091-6059")
        <<CONTACT_CARD>>  — IRI to AddressBook Person card (#this fragment)
        <<WIKI_PAGE>>     — IRI to /vault/wiki/people/<slug>/index.md
        <<MEMBERSHIP>>    — optional, IRI to AddressBook Membership #this

      Protocol:
        1. solid-pod read /vault/profile/card — see what's already present.
        2. For each triple in the body below, omit it if already present
           (CSS returns 409 Conflict on duplicate-insert).
        3. solid-pod patch /vault/profile/card --insert "<filled body>"
        4. On 422: parse text/turtle ValidationReport, fix MUSTs, retry.
           SHOULDs (sh:Warning) won't return 422 — they're advisory only.

      Patch is INSERT-ONLY (solid:inserts; CLI gap). Updates require a
      future delete-flavor template not present in v1.

      PROTECTED: solid:oidcIssuer MUST NEVER appear in the patch (Solid
      WebID Profile §3.2; CSS owns it; PATCH returns 409). The template
      body below correctly omits it.

      AUTH: pre-ACL this PATCH works unauthenticated. Post-ACL (Phase 6)
      requires Solid-OIDC + DPoP; authenticated agent must equal
      /vault/profile/card#me (acl:owner).
    """ ;
    tmpl:templateBody """
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix org:   <http://www.w3.org/ns/org#> .
@prefix pim:   <http://www.w3.org/ns/pim/space#> .
@prefix wiki:  <https://pod.vardeman.me/vault/ontology/wiki#> .

</vault/profile/card#me>
    a foaf:Agent, foaf:Person ;
    foaf:name              \"<<FULL_NAME>>\" ;
    pim:preferencesFile    </vault/settings/prefs.ttl> ;
    owl:sameAs             <https://orcid.org/<<ORCID>>> ,
                           <<<CONTACT_CARD>>> ;
    foaf:isPrimaryTopicOf  <<<WIKI_PAGE>>> .

# Follow-the-nose: assert the wiki page's type in this response so a single
# dereference of the WebID lets an LLM recognize the L3 agentic-memory record.
<<<WIKI_PAGE>>>  a wiki:Person .

# Optional — include this triple only if a current Membership was elicited:
# </vault/profile/card#me> org:hasMembership <<<MEMBERSHIP>>> .
""" .
```

- [ ] **Step 7.4: Run, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_owner_identity_templates.py -v
```

Expected: 4 passed.

- [ ] **Step 7.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/templates/webid-enrich.ttl tests/test_owner_identity_templates.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: webid-enrich.ttl PATCH template

Adds foaf:Agent (spec MUST), foaf:name, owl:sameAs ORCID + contact card,
foaf:isPrimaryTopicOf wiki page, pim:preferencesFile. Inlines
<wiki-page> a wiki:Person for single-dereference follow-the-nose
discovery (L1->L3 bridge). Avoids solid:oidcIssuer (Solid WebID Profile
§3.2 protected). Roundtrip test: CSS-minimal + filled patch conforms to
PodOwnerWebIDShape.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

# Part 5 — Capabilities, manifest, apply.py

## Task 8: Five capability descriptors

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/capabilities/pod-owner-identity.ttl`
- Create: `cogitarelink-solid/overlays/owner-identity/capabilities/webid-profile-shape.ttl`
- Create: `cogitarelink-solid/overlays/owner-identity/capabilities/pod-owner-preferences-shape.ttl`
- Create: `cogitarelink-solid/overlays/owner-identity/capabilities/webid-enrich-template.ttl`
- Create: `cogitarelink-solid/overlays/owner-identity/capabilities/prefs-init-template.ttl`

- [ ] **Step 8.1: Create pod-owner-identity.ttl (top-level)**

```turtle
@prefix cap:   <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .

<>  a cap:Capability ;
    cap:name "pod-owner-identity" ;
    cap:version "1.0" ;
    rdfs:label "Pod-Owner Identity" ;
    rdfs:comment "Substrate concern: the Pod owner's WebID profile is enriched per PodOwnerWebIDShape; the enrichment workflow uses /vault/settings/prefs.ttl as agent<->human elicitation surface (D90 candidate). Sits ABOVE AddressBook and wiki-memory in the capability stack so it can reference Person card + wiki page URIs from the WebID. Forward-extensible: VCs, DID-WebID bridges, ACL ownership (Phase 6) land here." ;
    cap:providedBy <https://pod.vardeman.me/vault/ontology/overlay#owner-identity> .
```

- [ ] **Step 8.2: Create webid-profile-shape.ttl**

```turtle
@prefix cap:   <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .

<>  a cap:Capability ;
    cap:name "webid-profile-shape" ;
    cap:version "1.0" ;
    rdfs:label "WebID Profile Shape" ;
    rdfs:comment "PodOwnerWebIDShape at /vault/meta/shapes/webid-profile.shacl.ttl. Spec-grounded SHACL contract for the Pod-owner WebID: MUST predicates (foaf:Agent, pim:preferencesFile, oidcIssuer, storage, publicTypeIndex), SHOULD enrichment (foaf:name, owl:sameAs ORCID+contact, foaf:isPrimaryTopicOf wiki page), MAY rich identity (org:hasMembership, foaf:img). Severities matched to spec normative weight." ;
    cap:providedBy <https://pod.vardeman.me/vault/ontology/overlay#owner-identity> ;
    cap:hostedAt <https://pod.vardeman.me/vault/meta/shapes/webid-profile.shacl.ttl> .
```

- [ ] **Step 8.3: Create pod-owner-preferences-shape.ttl**

```turtle
@prefix cap:   <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .

<>  a cap:Capability ;
    cap:name "pod-owner-preferences-shape" ;
    cap:version "1.0" ;
    rdfs:label "Pod-Owner Preferences Shape" ;
    rdfs:comment "PodOwnerPreferencesShape — the elicitation contract for /vault/settings/prefs.ttl. Required facts (fullName/orcid/wikiSlug with regex patterns) drive the agent<->human walk-through; optional facts (affiliation/role/dates/email/avatar) are elicited but not blocking; setupOwnerCompleted marker short-circuits re-runs." ;
    cap:providedBy <https://pod.vardeman.me/vault/ontology/overlay#owner-identity> ;
    cap:hostedAt <https://pod.vardeman.me/vault/meta/shapes/pod-owner-preferences.shacl.ttl> .
```

- [ ] **Step 8.4: Create webid-enrich-template.ttl**

```turtle
@prefix cap:   <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .

<>  a cap:Capability ;
    cap:name "webid-enrich-template" ;
    cap:version "1.0" ;
    rdfs:label "WebID Enrichment Template" ;
    rdfs:comment "First PATCH-flavor template in the substrate (tmpl:operation \"PATCH\" + tmpl:targetResource </vault/profile/card>). Inserts foaf:Agent/foaf:Person, foaf:name, owl:sameAs ORCID + contact card, foaf:isPrimaryTopicOf wiki page (with inlined wiki:Person type for follow-the-nose), pim:preferencesFile. Avoids the §3.2 protected predicate solid:oidcIssuer." ;
    cap:providedBy <https://pod.vardeman.me/vault/ontology/overlay#owner-identity> ;
    cap:hostedAt <https://pod.vardeman.me/vault/meta/templates/webid-enrich.ttl> .
```

- [ ] **Step 8.5: Create prefs-init-template.ttl**

```turtle
@prefix cap:   <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .

<>  a cap:Capability ;
    cap:name "prefs-init-template" ;
    cap:version "1.0" ;
    rdfs:label "Preferences-File Initialization Template" ;
    rdfs:comment "PUT-flavor template (tmpl:targetResource </vault/settings/prefs.ttl>) that mints an empty PodOwnerPreferences skeleton with commented placeholders for each prefs:* predicate. The empty skeleton is the canvas the agent fills via successive PATCH operations during the human elicitation walk-through." ;
    cap:providedBy <https://pod.vardeman.me/vault/ontology/overlay#owner-identity> ;
    cap:hostedAt <https://pod.vardeman.me/vault/meta/templates/prefs-init.ttl> .
```

- [ ] **Step 8.6: Verify all five parse**

```bash
~/uvws/.venv/bin/python -c "
from rdflib import Graph
import glob
for f in sorted(glob.glob('cogitarelink-solid/overlays/owner-identity/capabilities/*.ttl')):
    Graph().parse(f, format='turtle')
    print(f'OK {f}')
"
```

Expected: 5 lines of `OK …`.

- [ ] **Step 8.7: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/capabilities/
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: five capability descriptors

cap:pod-owner-identity (top-level), cap:webid-profile-shape,
cap:pod-owner-preferences-shape, cap:webid-enrich-template,
cap:prefs-init-template. Each describes its artifact and provider
overlay; the shape/template ones carry cap:hostedAt URLs so consumers
can dereference without reading the manifest first.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Resource `.meta` patch for `/vault/profile/card`

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/patches/profile-card-meta.ttl`

- [ ] **Step 9.1: Create the patch content**

Create `cogitarelink-solid/overlays/owner-identity/patches/profile-card-meta.ttl`:

```turtle
# Patch content for /vault/profile/card.meta — applied by apply.py via
# overlay:installsResourceMetaPatch in the owner-identity manifest.
#
# Adds dct:conformsTo pointing to PodOwnerWebIDShape (for ProfileLinkMetadataWriter
# per D86) and ldp:constrainedBy so SHACL validation engages on PATCH writes.

@prefix dct:  <http://purl.org/dc/terms/> .
@prefix ldp:  <http://www.w3.org/ns/ldp#> .

</vault/profile/card>
    dct:conformsTo    </vault/meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape> ;
    ldp:constrainedBy </vault/meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape> .
```

- [ ] **Step 9.2: Verify it parses**

```bash
~/uvws/.venv/bin/python -c "
from rdflib import Graph
g = Graph().parse('cogitarelink-solid/overlays/owner-identity/patches/profile-card-meta.ttl', format='turtle')
assert len(g) >= 2, f'Expected >=2 triples, got {len(g)}'
print(f'OK {len(g)} triples')
"
```

Expected: `OK 2 triples`.

- [ ] **Step 9.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/patches/profile-card-meta.ttl
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: profile-card-meta patch content

dct:conformsTo + ldp:constrainedBy pointing at PodOwnerWebIDShape.
Applied by apply.py via overlay:installsResourceMetaPatch (new manifest
predicate, parser+applier added in upcoming commits).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Owner-identity manifest

**Files:**
- Create: `cogitarelink-solid/overlays/owner-identity/manifest.ttl`

- [ ] **Step 10.1: Create the manifest**

```turtle
@prefix overlay: <https://pod.vardeman.me/vault/ontology/overlay#> .
@prefix cap:     <https://pod.vardeman.me/vault/ontology/capability#> .
@prefix wiki:    <https://pod.vardeman.me/vault/ontology/wiki#> .
@prefix prefs:   <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
@prefix tmpl:    <https://pod.vardeman.me/vault/ontology/template#> .
@prefix dct:     <http://purl.org/dc/terms/> .

<https://pod.vardeman.me/vault/ontology/overlay#owner-identity>
    a overlay:Overlay ;
    overlay:name "owner-identity" ;
    overlay:version "0.1" ;
    dct:conformsTo <https://pod.vardeman.me/vault/ontology/wiki#WikiMemoryProfile> ;

    overlay:declaresVocabulary [
        overlay:namespace prefs: ;
        overlay:document "vocabulary/owner-prefs.ttl" ;
        overlay:hostedAt "/vault/ontology/owner-prefs"
    ] ;

    overlay:requiresCapability
        [ cap:requires </vault/meta/capabilities/tmpl-vocabulary.ttl> ;
          cap:minVersion "1.1" ] ,
        [ cap:requires </vault/meta/capabilities/vcard-individual-substrate.ttl> ;
          cap:minVersion "1.0" ] ,
        [ cap:requires </vault/meta/capabilities/foaf-primarytopic-bridge.ttl> ;
          cap:minVersion "1.0" ] ;

    overlay:providesCapability
        [ cap:capability </vault/meta/capabilities/pod-owner-identity.ttl> ;
          cap:version "1.0" ; cap:descriptor "capabilities/pod-owner-identity.ttl" ] ,
        [ cap:capability </vault/meta/capabilities/webid-profile-shape.ttl> ;
          cap:version "1.0" ; cap:descriptor "capabilities/webid-profile-shape.ttl" ] ,
        [ cap:capability </vault/meta/capabilities/pod-owner-preferences-shape.ttl> ;
          cap:version "1.0" ; cap:descriptor "capabilities/pod-owner-preferences-shape.ttl" ] ,
        [ cap:capability </vault/meta/capabilities/webid-enrich-template.ttl> ;
          cap:version "1.0" ; cap:descriptor "capabilities/webid-enrich-template.ttl" ] ,
        [ cap:capability </vault/meta/capabilities/prefs-init-template.ttl> ;
          cap:version "1.0" ; cap:descriptor "capabilities/prefs-init-template.ttl" ] ;

    overlay:installsShape
        </vault/meta/shapes/webid-profile.shacl.ttl> ,
        </vault/meta/shapes/pod-owner-preferences.shacl.ttl> ;

    overlay:installsTemplate
        </vault/meta/templates/webid-enrich.ttl> ,
        </vault/meta/templates/prefs-init.ttl> ;

    overlay:installsResourceMetaPatch
        [ overlay:targetResource </vault/profile/card> ;
          overlay:metaPatchContent "profile-card-meta.ttl" ] .
```

- [ ] **Step 10.2: Verify it parses**

```bash
~/uvws/.venv/bin/python -c "
from rdflib import Graph
g = Graph().parse('cogitarelink-solid/overlays/owner-identity/manifest.ttl', format='turtle')
print(f'OK manifest parses, {len(g)} triples')
"
```

Expected: `OK manifest parses, <N> triples` (~30+).

- [ ] **Step 10.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add overlays/owner-identity/manifest.ttl
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity: manifest with D87 capabilities-only deps

requiresCapability: tmpl-vocabulary v1.1 (from AddressBook),
vcard-individual-substrate (AddressBook), foaf-primarytopic-bridge
(wiki-memory). providesCapability: 5 (pod-owner-identity + 2 shape +
2 template). installsShape/Template as usual; new
installsResourceMetaPatch points at profile-card-meta.ttl for the
.meta-side dct:conformsTo + ldp:constrainedBy on /vault/profile/card.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Extend Manifest parser for `installsResourceMetaPatch`

**Files:**
- Modify: `cogitarelink-solid/scripts/overlay/common.py` (find the dataclass + parse_manifest, add resource_meta_patches)
- Create: `cogitarelink-solid/tests/test_overlay_resource_meta_patch.py`

- [ ] **Step 11.1: Inspect current common.py to find Manifest dataclass + container_meta_patches handling**

```bash
~/uvws/.venv/bin/python -c "
import inspect
from scripts.overlay import common
print('--- Manifest dataclass ---')
print(inspect.getsource(common.Manifest))
print('--- container_meta_patch handling ---')
src = inspect.getsource(common.parse_manifest)
# Print the lines mentioning container_meta_patch
for i, line in enumerate(src.splitlines(), 1):
    if 'container_meta_patch' in line.lower() or 'ContainerMetaPatch' in line:
        print(f'{i}: {line}')
"
```

This locates the existing `container_meta_patch` handling so the new `resource_meta_patch` can mirror it.

- [ ] **Step 11.2: Write failing test for the new parser path**

Create `cogitarelink-solid/tests/test_overlay_resource_meta_patch.py`:

```python
"""Manifest parser: overlay:installsResourceMetaPatch -> resource_meta_patches."""
from pathlib import Path


def test_manifest_parses_installs_resource_meta_patch(tmp_path: Path):
    manifest_text = """
@prefix overlay: <https://pod.vardeman.me/vault/ontology/overlay#> .

<https://pod.vardeman.me/vault/ontology/overlay#test-overlay>
    a overlay:Overlay ;
    overlay:name "test" ;
    overlay:version "0.1" ;
    overlay:installsResourceMetaPatch
        [ overlay:targetResource </vault/profile/card> ;
          overlay:metaPatchContent "patches/profile-card-meta.ttl" ] .
"""
    (tmp_path / "manifest.ttl").write_text(manifest_text)
    (tmp_path / "patches").mkdir()
    (tmp_path / "patches" / "profile-card-meta.ttl").write_text(
        "@prefix dct: <http://purl.org/dc/terms/> .\n"
        "</vault/profile/card> dct:conformsTo </vault/meta/shapes/x.ttl#X> .\n"
    )

    from scripts.overlay.common import parse_manifest
    m = parse_manifest(tmp_path, pod_url="https://pod.vardeman.me/vault/")
    assert hasattr(m, "resource_meta_patches"), "Manifest must expose resource_meta_patches"
    assert len(m.resource_meta_patches) == 1
    rp = m.resource_meta_patches[0]
    assert rp.target_resource == "https://pod.vardeman.me/vault/profile/card"
    assert "dct:conformsTo" in rp.patch_body
```

- [ ] **Step 11.3: Run, expect FAIL**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_overlay_resource_meta_patch.py -v
```

Expected: `AttributeError: 'Manifest' object has no attribute 'resource_meta_patches'`.

- [ ] **Step 11.4: Extend `common.py`**

In `cogitarelink-solid/scripts/overlay/common.py`:

1. Define a `ResourceMetaPatch` dataclass mirroring the existing `ContainerMetaPatch` (likely named similarly — confirm via Step 11.1 output). Fields: `target_resource: str`, `patch_body: str`.

2. Add `resource_meta_patches: list[ResourceMetaPatch]` field (default `field(default_factory=list)`) to the `Manifest` dataclass.

3. In `parse_manifest`, immediately after the existing block that handles `overlay:installsContainerMetaPatch`, add an analogous block:

```python
# overlay:installsResourceMetaPatch — patches a specific resource's .meta
OVERLAY_NS = "https://pod.vardeman.me/vault/ontology/overlay#"
for _, _, patch_node in g.triples((overlay_iri, URIRef(OVERLAY_NS + "installsResourceMetaPatch"), None)):
    target = None
    content_rel = None
    for _, p, o in g.triples((patch_node, None, None)):
        if str(p) == OVERLAY_NS + "targetResource":
            target = str(o)
        elif str(p) == OVERLAY_NS + "metaPatchContent":
            content_rel = str(o)
    if not target or not content_rel:
        continue
    abs_target = absolutize_iri(target, pod_url)  # use the existing absolutize_iri helper
    body = (overlay_dir / content_rel).read_text()
    manifest.resource_meta_patches.append(
        ResourceMetaPatch(target_resource=abs_target, patch_body=body)
    )
```

(Adapt `absolutize_iri` to whatever the existing helper is called — Step 11.1 surfaced the existing container-meta-patch flow, copy that helper name.)

- [ ] **Step 11.5: Run, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/test_overlay_resource_meta_patch.py cogitarelink-solid/tests/test_overlay_template_parsing.py -v
```

Expected: 1 new passed + existing manifest-parser tests still passing.

- [ ] **Step 11.6: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add scripts/overlay/common.py tests/test_overlay_resource_meta_patch.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] overlay common: parse installsResourceMetaPatch

New ResourceMetaPatch dataclass + Manifest.resource_meta_patches field +
parser block mirroring container_meta_patch handling. Reads
overlay:targetResource + overlay:metaPatchContent blank node, resolves
the content file relative to the overlay directory, persists the body
as text for downstream PATCH dispatch.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: apply.py applies resource `.meta` patches

**Files:**
- Modify: `cogitarelink-solid/scripts/overlay/apply.py` (add new step 11b in `apply_overlay`)

- [ ] **Step 12.1: Locate the existing container_meta_patches step**

```bash
grep -n "container_meta_patches" cogitarelink-solid/scripts/overlay/apply.py
```

Note the line numbers — the new step inserts immediately after.

- [ ] **Step 12.2: Add the new step**

In `cogitarelink-solid/scripts/overlay/apply.py`, immediately after the existing `for meta_patch in manifest.container_meta_patches:` loop (currently labeled "11. PATCH .meta on typed subcontainers"), add:

```python
        # 11b. PATCH .meta on specific resources (e.g., dct:conformsTo + ldp:constrainedBy
        #     on /vault/profile/card so SHACL validation engages on writes; D86 PROF
        #     LinkMetadataWriter fires for the conformsTo predicate).
        for rp in manifest.resource_meta_patches:
            meta_url = rp.target_resource.rstrip("/") + ".meta"
            # Re-parse the patch body with the target resource as publicID so
            # `<>` resolves correctly, then serialize as N-Triples for the
            # insert block (same trick used for container .meta patches above).
            from rdflib import Graph
            mg = Graph()
            mg.parse(data=rp.patch_body, format="turtle", publicID=rp.target_resource)
            inserts = mg.serialize(format="nt").strip()
            if inserts:
                n3_patch_inserts(client, meta_url, inserts)
                print(f"  resource meta → {meta_url}")
```

- [ ] **Step 12.3: Smoke-test parse**

```bash
~/uvws/.venv/bin/python -c "from scripts.overlay import apply; print('OK')"
```

Expected: `OK` (syntactically valid).

- [ ] **Step 12.4: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add scripts/overlay/apply.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] apply.py: step 11b applies resource .meta patches

For each manifest.resource_meta_patches entry: derive <target>.meta URL,
re-parse the patch body with the target as publicID (so <> resolves
properly), serialize as N-Triples, n3_patch_inserts. Mirrors the
existing step-11 container .meta patcher.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Apply overlay to live Pod + integration test

**Files:**
- Create: `cogitarelink-solid/tests/integration/test_owner_identity_e2e.py`

- [ ] **Step 13.1: Pod up + apply overlay**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
docker compose up -d
# Wait until healthy, then apply overlay:
~/uvws/.venv/bin/python scripts/overlay/apply.py overlays/owner-identity https://pod.vardeman.me/vault/
```

Expected output: lines for vocab upload, 5 capability uploads, 2 shape uploads, 2 template uploads, 1 resource-meta patch. No errors.

- [ ] **Step 13.2: Manual smoke — verify artifacts dereference**

```bash
for path in \
  ontology/owner-prefs \
  meta/shapes/webid-profile.shacl.ttl \
  meta/shapes/pod-owner-preferences.shacl.ttl \
  meta/templates/webid-enrich.ttl \
  meta/templates/prefs-init.ttl \
  meta/capabilities/pod-owner-identity.ttl ; do
    code=$(curl -sk -o /dev/null -w "%{http_code}" "https://pod.vardeman.me/vault/${path}")
    echo "${code}  ${path}"
done
```

Expected: each line begins with `200`.

- [ ] **Step 13.3: Write integration test**

Create `cogitarelink-solid/tests/integration/test_owner_identity_e2e.py`:

```python
"""owner-identity overlay end-to-end against live Pod."""
import httpx
import pytest
from rdflib import Graph, Namespace, URIRef

POD = "https://pod.vardeman.me/vault/"
DCT  = Namespace("http://purl.org/dc/terms/")
LDP  = Namespace("http://www.w3.org/ns/ldp#")
TMPL = Namespace("https://pod.vardeman.me/vault/ontology/template#")
CAP  = Namespace("https://pod.vardeman.me/vault/ontology/capability#")

CLIENT = httpx.Client(verify=False, timeout=10)


def _fetch_ttl(url: str) -> Graph:
    r = CLIENT.get(url, headers={"Accept": "text/turtle"})
    r.raise_for_status()
    return Graph().parse(data=r.text, format="turtle", publicID=url)


def test_owner_identity_overlay_artifacts_dereference():
    for path in [
        "ontology/owner-prefs",
        "meta/shapes/webid-profile.shacl.ttl",
        "meta/shapes/pod-owner-preferences.shacl.ttl",
        "meta/templates/webid-enrich.ttl",
        "meta/templates/prefs-init.ttl",
        "meta/capabilities/pod-owner-identity.ttl",
        "meta/capabilities/webid-profile-shape.ttl",
        "meta/capabilities/pod-owner-preferences-shape.ttl",
        "meta/capabilities/webid-enrich-template.ttl",
        "meta/capabilities/prefs-init-template.ttl",
    ]:
        r = CLIENT.get(POD + path, headers={"Accept": "text/turtle"})
        assert r.status_code == 200, f"{path} -> HTTP {r.status_code}"


def test_profile_card_meta_advertises_shape():
    """/vault/profile/card.meta should carry dct:conformsTo + ldp:constrainedBy
    pointing at PodOwnerWebIDShape (applied by step 11b of apply.py)."""
    g = _fetch_ttl(POD + "profile/card.meta")
    card = URIRef(POD + "profile/card")
    shape = URIRef(POD + "meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape")
    assert (card, DCT.conformsTo, shape) in g, \
        f"profile/card.meta missing dct:conformsTo PodOwnerWebIDShape"
    assert (card, LDP.constrainedBy, shape) in g, \
        f"profile/card.meta missing ldp:constrainedBy PodOwnerWebIDShape"


def test_webid_enrich_template_has_target_resource():
    g = _fetch_ttl(POD + "meta/templates/webid-enrich.ttl")
    ops = list(g.objects(predicate=TMPL.operation))
    assert ops and str(ops[0]) == "PATCH"
    tgts = list(g.objects(predicate=TMPL.targetResource))
    assert tgts and str(tgts[0]).endswith("/profile/card")
```

- [ ] **Step 13.4: Run, expect PASS**

```bash
~/uvws/.venv/bin/python -m pytest cogitarelink-solid/tests/integration/test_owner_identity_e2e.py -v
```

Expected: 3 passed.

- [ ] **Step 13.5: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add tests/integration/test_owner_identity_e2e.py
git commit -m "$(cat <<'EOF'
[Agent: Claude] owner-identity e2e: overlay artifacts + profile-card.meta

Three integration tests against live Pod: (1) all 10 overlay artifacts
dereference 200, (2) /vault/profile/card.meta carries the
dct:conformsTo + ldp:constrainedBy patched by apply.py step 11b,
(3) webid-enrich template declares PATCH + targetResource /vault/profile/card
(first tmpl:targetResource consumer).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

End of Part 5 — substrate is fully shipped. Parts 6-8 build the agent skills against this substrate.

---

# Part 6 — `solid-addressbook` skill

The three skill files are docs-only (Markdown with YAML frontmatter), no unit tests. Each task creates one well-scoped section of the SKILL.md. The end-of-skill smoke test verifies frontmatter parses and key URLs are reachable.

## Task 14: `solid-addressbook` — frontmatter + Quick reference + Discovery

**Files:**
- Create: `solid-agent-skills/skills/solid-addressbook/SKILL.md`

- [ ] **Step 14.1: Create the file with frontmatter, Quick reference, Step 1 (Discover)**

Create `solid-agent-skills/skills/solid-addressbook/SKILL.md` starting with:

```markdown
---
name: solid-addressbook
description: Solid Pod AddressBook substrate operations — discover, read, and write SolidOS-compatible vcard contact cards (Person, Organization, Group, Membership). Use whenever creating or finding contacts in /vault/contacts/, mining ORCID/ROR/WebID anchors, building time-scoped affiliations via org:Membership, patching AddressBook index files (people.ttl, groups.ttl), or invoking find-by-orcid / find-by-name affordances. Each create operation fetches a tmpl:Template, fills <<PLACEHOLDER>> values, PUTs, and consumes SHACL ValidationReport on 422 for self-correction.
---

# AddressBook Substrate Operations

SolidOS-compatible vcard contact directory at `/vault/contacts/`. Four
shape classes (Person/Organization/Group/Membership), five create
templates, eight read affordances. Each write is template-driven: the
substrate ships the body skeleton + agent-instruction; you fill placeholders
+ PUT/PATCH.

## Quick reference

| Container | Class | URL |
|---|---|---|
| Person | `vcard:Individual` (also `foaf:Person`) | `/vault/contacts/Person/<uuid>.ttl#this` |
| Organization | `vcard:Organization` (also `foaf:Organization`) | `/vault/contacts/Organization/<uuid>.ttl#this` |
| Group | `vcard:Group` | `/vault/contacts/Group/<slug>.ttl#this` |
| Membership | `org:Membership` | `/vault/contacts/Membership/<uuid>.ttl#this` |

| Index file | Role |
|---|---|
| `/vault/contacts/index.ttl#this` | `vcard:AddressBook` root |
| `/vault/contacts/people.ttl` | `vcard:nameEmailIndex` — Persons + Orgs by `vcard:fn` |
| `/vault/contacts/groups.ttl` | `vcard:groupIndex` |

Shape catalog: `/vault/meta/shapes/{contact-card,organization-card,group,membership}.shacl.ttl`
Templates: `/vault/meta/templates/{contact-create,contact-update,org-create,group-create,membership-create}.ttl`
Read affordances: `/vault/meta/affordances/{contact-find-by-name,contact-find-by-orcid,contact-find-by-email,contact-find-by-affiliation,contact-find-by-group,org-find-by-name,org-find-by-ror,bridge-card-to-wiki}.ttl`

## Step 1 — Discover the AddressBook

```
solid-pod info https://pod.vardeman.me/vault/
   → storage description carries wiki:typeIndex pointer
solid-pod read /vault/settings/publicTypeIndex
   → solid:forClass vcard:AddressBook ; solid:instance </vault/contacts/index.ttl#this>
solid-pod read /vault/contacts/
   → ldp:contains lists Person/, Organization/, Group/, Membership/ + index files
solid-pod shapes /vault/meta/shapes/
   → SHACL shapes (with sh:agentInstruction guidance)
```

The Type Index hop is what makes the AddressBook discoverable across
unrelated Pods — any Pod registering `vcard:AddressBook` in its Type Index
exposes the same contract.
```

- [ ] **Step 14.2: Verify frontmatter parses + sections exist**

```bash
~/uvws/.venv/bin/python -c "
import yaml, re, pathlib
p = pathlib.Path('solid-agent-skills/skills/solid-addressbook/SKILL.md')
text = p.read_text()
m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
assert m, 'no YAML frontmatter'
fm = yaml.safe_load(m.group(1))
assert fm['name'] == 'solid-addressbook'
assert 'description' in fm and len(fm['description']) > 100
assert '## Quick reference' in text and '## Step 1' in text
print('OK frontmatter + sections')
"
```

Expected: `OK frontmatter + sections`.

- [ ] **Step 14.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-addressbook/SKILL.md
git commit -m "$(cat <<'EOF'
[Agent: Claude] solid-addressbook: frontmatter + Quick reference + Discovery

Initial scaffold for the AddressBook agent skill. Quick-reference table
maps the four shape classes to their containers + URLs. Step 1 documents
the storage-description -> Type Index -> contacts/ discovery chain. The
rest of the skill (procedures, gotchas) lands in subsequent commits.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: `solid-addressbook` — CreatePersonContact procedure

**Files:**
- Modify: `solid-agent-skills/skills/solid-addressbook/SKILL.md` (append section)

- [ ] **Step 15.1: Append the procedure**

Append to the SKILL.md:

````markdown

## Procedure — Create a Person contact

The contact-create template ships the body skeleton + a `sh:agentInstruction`
with the exact placeholder list. Follow that instruction, but the high-level
shape is:

```
solid-pod read /vault/meta/templates/contact-create.ttl
  → returns: tmpl:templateBody  (with <<FULL_NAME>>, <<ORCID>>, <<EMAIL>>, ...)
             tmpl:targetContainer </vault/contacts/Person/>
             tmpl:slugAlgorithm "uuid4"
             sh:agentInstruction "Generate UUIDv4, PUT to <target>/<uuid>.ttl, patch index..."

mint UUIDv4 (Python: import uuid; uuid.uuid4().hex with dashes)
fill placeholders from elicited facts
solid-pod create /vault/contacts/Person/ --slug <uuid>.ttl \
    --content-type text/turtle --body "<filled body>" \
    --meta "<#this> a vcard:Individual ."     # optional; shape covers main constraints
solid-pod patch /vault/contacts/people.ttl --insert "
    <#book> <http://www.w3.org/2006/vcard/ns#fn> \"<FULL_NAME>\" ;
            <http://www.w3.org/2006/vcard/ns#hasMember> </vault/contacts/Person/<uuid>.ttl#this> .
"
```

**Minimum invariant** (ContactCardShape enforces): `vcard:fn` + `vcard:inAddressBook` + at least one anchor (`owl:sameAs <orcid>` preferred, `vcard:hasEmail`, or `vcard:hasTelephone`).

**On HTTP 422:** the response body is `text/turtle` carrying an `sh:ValidationReport`. Parse it, read `sh:focusNode` / `sh:resultPath` / `sh:resultMessage`, fix the cited fields, retry the PUT.

**Counter-intuitive constraint** (MEMORY caveat): the `vcard:inAddressBook` value resolves against the *server root*, not the vault root. Cards must use the absolute IRI `https://pod.vardeman.me/vault/contacts/index.ttl#this` (not `</contacts/index.ttl#this>`) to validate.

**Flat layout, not per-person sub-containers** (MEMORY caveat): the `Person/` container has `ldp:constrainedBy` pointing at ContactCardShape, which CSS interprets as blocking sub-container creation. So Person cards live at `/contacts/Person/<uuid>.ttl`, not `/contacts/Person/<uuid>/index.ttl`. Attachment workflows that need a per-person directory must use a separate constrained container (deferred).

**Authoritative anchor preference** (substrate convention): for researchers, `owl:sameAs <https://orcid.org/...>` is the canonical join key — pick it over email when both are known. ORCID enables cross-Pod identity reconciliation; email doesn't.
````

- [ ] **Step 15.2: Verify still parses**

```bash
~/uvws/.venv/bin/python -c "
import yaml, re, pathlib
text = pathlib.Path('solid-agent-skills/skills/solid-addressbook/SKILL.md').read_text()
m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
yaml.safe_load(m.group(1))
assert '## Procedure — Create a Person contact' in text
print('OK')
"
```

Expected: `OK`.

- [ ] **Step 15.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-addressbook/SKILL.md
git commit -m "[Agent: Claude] solid-addressbook: Create Person procedure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 16: `solid-addressbook` — CreateOrganization + CreateMembership procedures

**Files:**
- Modify: `solid-agent-skills/skills/solid-addressbook/SKILL.md`

- [ ] **Step 16.1: Append both procedures**

Append:

````markdown

## Procedure — Create an Organization

Same pattern as Person via `org-create` template. Anchor preference: `owl:sameAs <https://ror.org/<ROR_ID>>` for institutional orgs; `vcard:hasURL` fallback for commercial/informal orgs without ROR. ROR IDs are bare (no URI prefix in template; the template body adds `https://ror.org/`).

```
solid-pod read /vault/meta/templates/org-create.ttl
mint UUIDv4
fill <<ORGANIZATION_NAME>>, <<ROR>> (or <<HOMEPAGE>>)
solid-pod create /vault/contacts/Organization/ --slug <uuid>.ttl --content-type text/turtle --body "<filled>"
solid-pod patch /vault/contacts/people.ttl --insert "<#book> vcard:fn \"<NAME>\" ; vcard:hasMember </vault/contacts/Organization/<uuid>.ttl#this> ."
```

Orgs are co-listed in `people.ttl` with Persons (SolidOS unified name-lookup convention) — single name-emails-index serves both.

## Procedure — Create a Membership (Person ↔ Org with date range)

`org:Membership` reifies the relationship "Person X is a member of Org Y from date A to date B, in role R." Distinct from a flat `vcard:organization-name "Notre Dame"` literal — supports time-scoped affiliations and SPARQL graph traversal.

```
solid-pod read /vault/meta/templates/membership-create.ttl
mint UUIDv4
fill <<PERSON_UUID>>, <<ORG_UUID>>, <<ROLE>>, <<START_DATE>>, optionally <<END_DATE>>
solid-pod create /vault/contacts/Membership/ --slug <uuid>.ttl --content-type text/turtle --body "<filled>"
```

The membership-create template generates a body like:

```turtle
<#this> a <http://www.w3.org/ns/org#Membership> ;
    <http://www.w3.org/ns/org#member>       </vault/contacts/Person/<PERSON_UUID>.ttl#this> ;
    <http://www.w3.org/ns/org#organization> </vault/contacts/Organization/<ORG_UUID>.ttl#this> ;
    <http://www.w3.org/ns/org#memberDuring> [
        <http://www.w3.org/2006/time#hasBeginning>
          [ <http://www.w3.org/2006/time#inXSDDate> "<START_DATE>"^^<http://www.w3.org/2001/XMLSchema#date> ]
    ] ;
    <http://www.w3.org/ns/org#role> "<ROLE>" .
```

After PUT, the Membership IRI (`#this` fragment) becomes the value used in `org:hasMembership` triples on the Person's WebID and/or contact card.
````

- [ ] **Step 16.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-addressbook/SKILL.md
git commit -m "[Agent: Claude] solid-addressbook: Organization + Membership procedures

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 17: `solid-addressbook` — Find contacts procedure

- [ ] **Step 17.1: Append**

````markdown

## Procedure — Find contacts (via affordances)

The substrate ships eight read affordances under `/vault/meta/affordances/`. Each declares a `wiki:selectQuery` parameterized SPARQL. Invoke with `solid-pod invoke`:

```
solid-pod invoke https://pod.vardeman.me/vault/ contact-find-by-orcid \
    --default-graph-uri https://pod.vardeman.me/vault/contacts/people.ttl \
    --default-graph-uri https://pod.vardeman.me/vault/contacts/Person/<any>.ttl
```

The affordances:

| Name | Inputs | Returns |
|---|---|---|
| `contact-find-by-orcid` | ORCID URI | Person card IRI |
| `contact-find-by-email` | mailto: URI | Person card IRI |
| `contact-find-by-name` | substring | matching Person/Org IRIs |
| `contact-find-by-affiliation` | Org IRI | Persons with active membership |
| `contact-find-by-group` | Group IRI | Group members |
| `org-find-by-name` | substring | Org IRIs |
| `org-find-by-ror` | ROR URI | Org IRI |
| `bridge-card-to-wiki` | card #this IRI | wiki page IRI via foaf:isPrimaryTopicOf |

**RQ-Pod-4 caveat:** Comunica skips `describedby` Link headers on `text/markdown` resources. For affordances querying `.meta` content, pass explicit `--default-graph-uri` arguments pointing at the relevant `.meta` URLs (the affordance's `sh:agentInstruction` typically lists which graphs to load).

**For programmatic use** (e.g., setup-owner Phase B checking "does an owner card already exist?"): prefer `solid-pod sparql` with an explicit query over the `find-by-orcid` invocation — the affordance does the same query, but a custom SELECT lets you control output shape exactly.
````

- [ ] **Step 17.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-addressbook/SKILL.md
git commit -m "[Agent: Claude] solid-addressbook: Find contacts via 8 read affordances

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 18: `solid-addressbook` — Owner-setup contribution + Known gotchas

- [ ] **Step 18.1: Append**

````markdown

## Procedure — Pod-owner setup contribution

Called by `solid-owner-identity` Phase B and Phase C. Walks the same Person/Org/Membership paths above, parameterized from `/vault/settings/prefs.ttl` facts. Idempotence at each phase:

- **Phase B (Person card):** before mint, query `/vault/contacts/people.ttl` for an entry whose Person has `owl:sameAs <https://orcid.org/<prefs:orcid>>` — if found, return the existing card IRI without writing.
- **Phase C (Org card):** if `prefs:primaryAffiliationROR` present, query for an Organization with `owl:sameAs <https://ror.org/<that-ROR>>`. Mint only if absent.
- **Phase C (Membership):** there's no obvious natural key for an org:Membership beyond `(person, org)` pair; if a Membership linking the owner Person to the affiliation Org already exists, skip the new mint.

Hand the resulting IRIs (Person card `#this`, Org card `#this`, Membership `#this`) back up to `solid-owner-identity` for use in Phase D (wiki page bridge) and Phase E (WebID enrichment).

## Known gotchas

- **`vcard:inAddressBook` absolute IRI** (above): use the full `https://pod.vardeman.me/vault/contacts/index.ttl#this`, not a vault-relative IRI.
- **No per-Person sub-containers** (above): flat `<container>/<uuid>.ttl` layout because `Person/` is constrained.
- **`people.ttl` index patches** must use absolute IRIs in both subject (`<#book>`) and object (the new member). The CLI's `solid-pod patch` wraps your `--insert` argument in `solid:inserts {...}`, so include prefixes inline or use full IRIs.
- **`org:Membership` queries via SPARQL** must traverse the reified node; the membership has its own URI, not a direct property of the Person.
- **D87 capabilities-only deps** mean older overlay code that referenced `overlay:dependsOnOverlay` is gone — declare `cap:requires <descriptor.ttl>` against specific capability descriptors, not against the AddressBook overlay as a whole.
````

- [ ] **Step 18.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-addressbook/SKILL.md
git commit -m "[Agent: Claude] solid-addressbook: setup-owner contribution + gotchas

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

# Part 7 — `solid-wiki-memory-l3` skill (minimal scope)

## Task 19: Frontmatter + Quick reference + Discovery + Concepts

**Files:**
- Create: `solid-agent-skills/skills/solid-wiki-memory-l3/SKILL.md`

- [ ] **Step 19.1: Create with frontmatter, Quick ref, Discovery, Concepts**

Create `solid-agent-skills/skills/solid-wiki-memory-l3/SKILL.md`:

````markdown
---
name: solid-wiki-memory-l3
description: Wiki-memory L3 (memory profile) operations on a Solid Pod — class-based wiki page reads/writes, dual-layer linking (markdown wikilinks + .meta projection per D58/D71), foaf:primaryTopic bridging from wiki pages to WebID/AddressBook identity. Use whenever working with /vault/wiki/{pages,sources,people,procedures,working}/, when creating agentic-memory records that need to be both LLM-readable (markdown) and SPARQL-queryable (.meta triples), or when bridging a wiki person page to its L1 WebID + L2 AddressBook contact card. Includes the RQ-Pod-4 explicit-source SPARQL workaround for .meta traversal.
---

# Wiki-Memory L3 Operations (Minimal Scope This Sprint)

This sprint ships **the subset of wiki-memory L3 needed by the setup-owner workflow**: discovery, the `wiki:Person` class path, and the L3→L1/L2 bridge procedure. The two-stage commit (D73 working-memory + `mem:Crystallize`), full coverage of the other shape classes (Concept/Source/Procedure/WorkingMemory/Page), and memory-substrate triggers (D74) are deferred to a follow-on **Memory Structuring Sprint**.

## Quick reference

| Container | Class | URL |
|---|---|---|
| Pages | `wiki:Page` | `/vault/wiki/pages/<slug>/index.md` |
| Sources | `wiki:Source` | `/vault/wiki/sources/<slug>/index.md` |
| People | `wiki:Person` | `/vault/wiki/people/<slug>/index.md` |
| Procedures | `wiki:Procedure` | `/vault/wiki/procedures/<slug>/index.md` |
| Working | `wiki:WorkingMemory` | `/vault/wiki/working/<slug>/index.md` |

Shape catalog: `/vault/meta/shapes/{resource,concept,source,person,procedure,working}.shacl.ttl` (5+resource per D77).
JSON-LD context (predicate registry): `/vault/meta/context.jsonld` (D79).
Type Index: `/vault/settings/publicTypeIndex` — `solid:forClass wiki:Person ; solid:instance /vault/wiki/people/`, etc.

## Step 1 — Discover

```
solid-pod info /vault/                          # storage description
  → wiki:shapeCatalog        → /vault/meta/shapes/
  → wiki:contextDocument     → /vault/meta/context.jsonld
  → wiki:typeIndex           → /vault/settings/publicTypeIndex
  → rdfs:seeAlso (×5)        → /vault/wiki/{pages,sources,people,procedures,working}/
solid-pod shapes /vault/meta/shapes/            # list shapes with sh:agentInstruction
```

## Concept — Three-layer stratification (D70)

Wiki-memory L3 is the **memory profile** layer:
- **L1 Pod substrate**: LDP / WAC / RDF (what every Solid Pod has)
- **L2 Memory substrate**: seven invariants (bounded branching, tiered retrieval, lifecycle metadata, …)
- **L3 Memory profile**: wiki-memory is the canonical reference profile, the page-as-unit + dual-layer + class-based pattern

This skill operates at L3. When a wiki page bridges to an `L1` WebID, it's reaching down through L2 into the Pod substrate.

## Concept — Dual-layer linking (D58/D71)

A wiki page's body is markdown with typed wikilinks:

```markdown
This concept builds on [[Progressive Disclosure]]{.concept} and cites
[[@hu-2026-beyond-rag]]{.source} and [[charles]]{.person}.
```

On write, `MarkdownProjectionListener` (D58/D71) projects the wikilinks into
the page's `.meta` graph as typed RDF predicates:

```turtle
</vault/wiki/pages/this/index.md>
    wiki:relatesTo  </vault/wiki/pages/progressive-disclosure/index.md> ;
    cito:cites      </vault/wiki/sources/hu-2026-beyond-rag/index.md> ;
    wiki:mentions   </vault/wiki/people/charles/index.md> .
```

The same write produces *both* the LLM-readable markdown body *and* SPARQL-queryable `.meta` triples. The agent's job is to write good body wikilinks; the substrate generates the structured edges.

**Predicate-level governance** (D81 Model A): each shape declares which predicates the substrate owns (projects/validates) and which the agent owns (free-form). The agent only writes wikilinks; the projector emits the typed predicates.
````

- [ ] **Step 19.2: Verify**

```bash
~/uvws/.venv/bin/python -c "
import yaml, re, pathlib
text = pathlib.Path('solid-agent-skills/skills/solid-wiki-memory-l3/SKILL.md').read_text()
fm = yaml.safe_load(re.match(r'^---\n(.*?)\n---\n', text, re.S).group(1))
assert fm['name'] == 'solid-wiki-memory-l3'
assert '## Quick reference' in text and '## Concept' in text
print('OK')
"
```

Expected: `OK`.

- [ ] **Step 19.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-wiki-memory-l3/SKILL.md
git commit -m "[Agent: Claude] solid-wiki-memory-l3: scaffold (Quick ref + Discovery + Concepts)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 20: `solid-wiki-memory-l3` — Read + Create Person page procedures

- [ ] **Step 20.1: Append**

````markdown

## Procedure — Read a wiki page

```
solid-pod read /vault/wiki/people/<slug>/index.md
   → returns:  content  (markdown body)
               meta     (JSON-LD .meta with wiki:Person + projected predicates)
               affordances: { describedby: "/vault/wiki/people/<slug>/index.md.meta", ... }
```

The `solid-pod read` command auto-fetches the `describedby` `.meta` and returns both body + meta in one shot. For SPARQL access to the `.meta` graph specifically, use:

```
solid-pod sparql https://pod.vardeman.me/vault/ "SELECT ..." \
    --default-graph-uri https://pod.vardeman.me/vault/wiki/people/<slug>/index.md.meta
```

## Procedure — Create a wiki Person page

Class-based dispatch (D78): the Type Index says `wiki:Person → /vault/wiki/people/`, the shape catalog says `wiki:Person → person.shacl.ttl`. The minimal `wiki:Person` body is markdown + a few `.meta` triples:

```
mint slug (lowercase + hyphens; from prefs:wikiSlug or by ask)
build markdown body (minimal seed):
  # <Full Name>

  Pod-owner agentic-memory record. The canonical identity is the
  Pod-owner WebID `[[charles-webid]]{.webid}` (or however the bridge
  predicate convention names this — see below). Operational identity
  in the AddressBook at `[[charles-contact]]{.contact}`.

  ## Notes
  (free-form; this is the L3 deep-context layer)

solid-pod create /vault/wiki/people/ --slug <slug>/index.md \
    --content-type text/markdown \
    --body "<markdown body>" \
    --meta "
@prefix wiki: <https://pod.vardeman.me/vault/ontology/wiki#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

<> a wiki:Person ;
   foaf:name \"<Full Name>\" ;
   foaf:primaryTopic </vault/profile/card#me> ;
   owl:sameAs </vault/contacts/Person/<contact-uuid>.ttl#this> .
"
```

The `--meta` argument is patched via `solid:inserts` into the `.meta` sidecar. The `foaf:primaryTopic <WebID>` triple is the L3 → L1 bridge — declared at write time, the wiki page now formally asserts "the WebID is my primary subject."

**Slug collision**: if `/vault/wiki/people/<slug>/index.md` already exists (HTTP 200 on the URL), ask the human to disambiguate before overwriting. If the existing page already has `foaf:primaryTopic <WebID>`, treat it as the bridge target — return the existing IRI without writing.

**Deferred to Memory Structuring Sprint**: two-stage commit via `/vault/wiki/working/` permissive shape → `mem:Crystallize` → durable container. For setup-owner, write the Person page directly to its durable container — the use case is bootstrap, not in-flight knowledge consolidation.
````

- [ ] **Step 20.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-wiki-memory-l3/SKILL.md
git commit -m "[Agent: Claude] solid-wiki-memory-l3: Read + Create Person page procedures

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 21: `solid-wiki-memory-l3` — Bridge procedure (the setup-owner-relevant part)

- [ ] **Step 21.1: Append**

````markdown

## Procedure — Bridge a wiki Person page to identity (L1 + L2)

Called by `solid-owner-identity` Phase D. The wiki page (L3) asserts its
membership in the identity stack via two `.meta` triples:

```
solid-pod patch /vault/wiki/people/<slug>/index.md.meta --insert "
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

</vault/wiki/people/<slug>/index.md>
    foaf:primaryTopic   </vault/profile/card#me> ;
    owl:sameAs          </vault/contacts/Person/<contact-uuid>.ttl#this> .
"
```

The reverse direction is asserted by `solid-owner-identity` Phase E via the
webid-enrich template:

- `<WebID> foaf:isPrimaryTopicOf <wiki-page>` — endorsed by Solid WebID Profile §3.1 for "extended profile documents"
- `<wiki-page> a wiki:Person` — *inlined in the WebID response* so an LLM dereferencing the WebID recognizes the L3 agentic-memory record in a single round-trip (follow-the-nose discovery)

**Symmetry table:**

| Direction | Predicate | Lives in |
|---|---|---|
| WebID → wiki page | `foaf:isPrimaryTopicOf` | `/vault/profile/card` (body) |
| WebID → wiki page type | `<wiki-page> a wiki:Person` | `/vault/profile/card` (body, inlined) |
| Wiki page → WebID | `foaf:primaryTopic` | `<wiki-page>.meta` |
| Wiki page → contact card | `owl:sameAs <contact-#this>` | `<wiki-page>.meta` |
| WebID → contact card | `owl:sameAs <contact-#this>` | `/vault/profile/card` (body) |
| Contact card → WebID | `vcard:url [ vcard:WebId ; vcard:value <WebID> ]` | contact-card body (SolidOS convention, optional) |

**Idempotence:** before patching, `solid-pod read /vault/wiki/people/<slug>/index.md.meta` and check for existing `foaf:primaryTopic` and `owl:sameAs` triples. Drop any duplicates from the `--insert` argument (CSS returns 409 Conflict otherwise).
````

- [ ] **Step 21.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-wiki-memory-l3/SKILL.md
git commit -m "[Agent: Claude] solid-wiki-memory-l3: bridge L3 wiki page to L1 WebID + L2 contact

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 22: `solid-wiki-memory-l3` — Query procedure + Known gaps + Deferred

- [ ] **Step 22.1: Append**

````markdown

## Procedure — Query the wiki graph

Comunica's link-traversal follows `ldp:contains` but **skips `describedby` Link headers on `text/markdown` resources** (RQ-Pod-4). To SPARQL over `.meta` content, pass explicit `default-graph-uri` parameters pointing at each `.meta` URL:

```
solid-pod sparql https://pod.vardeman.me/vault/ "
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX wiki: <https://pod.vardeman.me/vault/ontology/wiki#>

    SELECT ?page ?subjectWebID WHERE {
      ?page a wiki:Person ;
            foaf:primaryTopic ?subjectWebID .
    }
" \
    --default-graph-uri https://pod.vardeman.me/vault/wiki/people/charles/index.md.meta
```

For batch queries across all wiki Person pages, list each `.meta` URL — or use the `solid-pod sparql` auto-discovery against the `/vault/wiki/people/` container, which enumerates contained resources and fetches each `.meta`.

## Known gaps

- **RQ-Pod-4**: Comunica `describedby` skip on `text/markdown`. Workaround: explicit `--default-graph-uri`. Materialized SPARQL index deferred.
- **RQ-Listener-1**: CSS `FileDataAccessor.writeMetadataFile()` races `MarkdownProjectionListener` — projected predicates on write don't always land if the agent reads the `.meta` immediately after write. Workaround: re-read after a short wait, or trust the write succeeded and proceed.
- **RQ-Pod-6**: `.meta` richness vs query overhead unbenchmarked beyond 100 resources.

## Deferred to Memory Structuring Sprint

This sprint ships only what setup-owner needs (`wiki:Person` create + bridge). The follow-on sprint covers:

- Two-stage commit (D73): `/vault/wiki/working/` permissive shape + `mem:Crystallize` durable promotion
- Full coverage of `wiki:Concept`, `wiki:Source`, `wiki:Procedure`, `wiki:Page`, `wiki:WorkingMemory` create procedures
- Memory-substrate triggers (D74): `mem:*` AS2 vocab on LDN inbox, Solid Notifications dispatch by `rdf:type`
- Compile-once procedures (D72): substrate maintains compiled state
- Lifecycle metadata invariants from L2 (when/why a memory was made; access counters; etc.)
- Empirical guidance from Rung 1.5 eval feeding back into the skill text
````

- [ ] **Step 22.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-wiki-memory-l3/SKILL.md
git commit -m "[Agent: Claude] solid-wiki-memory-l3: query + known gaps + deferred items

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

# Part 8 — `solid-owner-identity` skill (orchestrator)

## Task 23: Frontmatter + Quick reference + Three-layer concept

**Files:**
- Create: `solid-agent-skills/skills/solid-owner-identity/SKILL.md`

- [ ] **Step 23.1: Create**

````markdown
---
name: solid-owner-identity
description: Pod-owner identity operations — WebID profile reads + enrichment, preferences-file elicitation, and the canonical cold-start "Set up Pod owner" procedure that orchestrates AddressBook + wiki-memory L3 skills. Use whenever arriving at a Pod and needing to learn who owns it, when enriching a CSS-minted minimal WebID, when walking a human through Pod bootstrap, or when reasoning about Pod-owner identity claims (foaf:name, owl:sameAs <orcid>, org:hasMembership, foaf:isPrimaryTopicOf the L3 agentic-memory page). Forward-looking: extends to VC-issued claims (cred:credentialSubject), DID-WebID bridges (alsoKnownAs <did:>), and ACL ownership wiring as those land in later sprints.
---

# Pod-Owner Identity Operations

The Pod-owner WebID at `/vault/profile/card#me` is the canonical agent identity of the Pod. CSS mints a minimal version on account creation (foaf:Person, oidcIssuer, storage, publicTypeIndex). This skill enriches it through the agent↔human elicitation pattern and orchestrates the cross-cutting **Set up Pod owner** procedure that wires the three identity layers together.

## Quick reference

| Substrate URL | Role |
|---|---|
| `/vault/meta/overlays/owner-identity/manifest.ttl` | Overlay manifest (D87 capabilities-only deps) |
| `/vault/meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape` | WebID profile SHACL contract |
| `/vault/meta/shapes/pod-owner-preferences.shacl.ttl#PodOwnerPreferencesShape` | Elicitation contract for /vault/settings/prefs.ttl |
| `/vault/meta/templates/webid-enrich.ttl` | PATCH template (first tmpl:targetResource consumer) |
| `/vault/meta/templates/prefs-init.ttl` | PUT template — prefs-file skeleton |
| `/vault/meta/capabilities/pod-owner-identity.ttl` | Top-level capability descriptor |
| `/vault/ontology/owner-prefs` | `prefs:` vocabulary |

## Concept — Three-layer Pod-owner identity

| Layer | Artifact | Role | URL |
|---|---|---|---|
| **L1** | WebID profile | Canonical identity, auth, spec-required | `/vault/profile/card#me` |
| **L2** | AddressBook contact card | vcard, time-scoped affiliations, app-compat | `/vault/contacts/Person/<uuid>.ttl#this` |
| **L3** | Wiki person page | Agentic memory — markdown + concept edges + sources | `/vault/wiki/people/<slug>/index.md` |

All three IRIs denote the same agent. Bridge predicates make the equivalence explicit:

- L1→ORCID: `owl:sameAs <https://orcid.org/...>` (spec-endorsed §3.3)
- L1→L2: `owl:sameAs <contact-#this>`
- L1→L3: `foaf:isPrimaryTopicOf <wiki-page>` + inlined `<wiki-page> a wiki:Person` (follow-the-nose)
- L3→L1: `foaf:primaryTopic <WebID>` in wiki page's `.meta`
- L2→L1: `vcard:url [ vcard:WebId ; vcard:value <WebID> ]` (SolidOS convention, optional)
````

- [ ] **Step 23.2: Verify**

```bash
~/uvws/.venv/bin/python -c "
import yaml, re, pathlib
text = pathlib.Path('solid-agent-skills/skills/solid-owner-identity/SKILL.md').read_text()
fm = yaml.safe_load(re.match(r'^---\n(.*?)\n---\n', text, re.S).group(1))
assert fm['name'] == 'solid-owner-identity'
assert 'Three-layer' in text
print('OK')
"
```

Expected: `OK`.

- [ ] **Step 23.3: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: scaffold (Quick ref + 3-layer concept)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 24: Discover + Read current state procedures

- [ ] **Step 24.1: Append**

````markdown

## Step 1 — Discover the owner-identity overlay

```
solid-pod info /vault/
   → storage description carries dct:conformsTo + provided capabilities
solid-pod read /vault/meta/capabilities/pod-owner-identity.ttl
   → cap:providedBy <ontology/overlay#owner-identity>
solid-pod read /vault/meta/shapes/webid-profile.shacl.ttl
   → PodOwnerWebIDShape with the agentInstruction text (read this!)
```

## Step 2 — Read current Pod-owner state

```
solid-pod read /vault/profile/card
```

Classify the result:

- **CSS-default minimal**: only `foaf:Person`, `solid:oidcIssuer`, `pim:storage`, `solid:publicTypeIndex`. → Full SetupPodOwner needed.
- **Partially enriched**: some subset of (`foaf:name`, `owl:sameAs`, `foaf:isPrimaryTopicOf`, `pim:preferencesFile`). → Resume from the first missing required predicate.
- **Fully enriched**: all MUSTs satisfied (foaf:Agent, pim:preferencesFile, oidcIssuer, storage, publicTypeIndex) AND `prefs:setupOwnerCompleted = true` at /vault/settings/prefs.ttl. → Report state, exit.

```
solid-pod read /vault/settings/prefs.ttl       # 200 + facts, or 404
```

If 404 or empty: this is a fresh Pod; SetupPodOwner Phase A creates it.
If 200 + setupOwnerCompleted: short-circuit; this skill's job is done.
````

- [ ] **Step 24.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: Discover + Read state procedures

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 25: SetupPodOwner Phase A (preferences elicitation)

- [ ] **Step 25.1: Append**

````markdown

## Procedure — Set up Pod owner (Phases A–F)

The cross-cutting flow. Each phase is idempotent on read; re-runs resume cleanly.

### Phase A — Preferences elicitation

The goal: produce a `/vault/settings/prefs.ttl` file conforming to `PodOwnerPreferencesShape` with the required facts (`prefs:fullName`, `prefs:orcid`, `prefs:wikiSlug`) populated from the human's answers.

```
1. solid-pod read /vault/settings/prefs.ttl
   404 → fetch prefs-init template, PUT skeleton:
       solid-pod read /vault/meta/templates/prefs-init.ttl
       (copy tmpl:templateBody verbatim — no placeholders to fill)
       solid-pod create /vault/settings/ --slug prefs.ttl \
           --content-type text/turtle --body "<template body>"
   200 → parse existing facts; check for prefs:setupOwnerCompleted = true → SHORT-CIRCUIT

2. For each REQUIRED predicate from PodOwnerPreferencesShape:
   - prefs:fullName    — "What's the Pod owner's full display name?"
   - prefs:orcid       — "What's their ORCID id? (format: XXXX-XXXX-XXXX-XXXX, X may be a digit or X)"
   - prefs:wikiSlug    — Suggest from fullName (lowercase first name or last name). Ask:
                         "Wiki slug for /vault/wiki/people/<slug>/? Default: <suggestion>"

   For each answer, PATCH /vault/settings/prefs.ttl:
       solid-pod patch /vault/settings/prefs.ttl --insert "
           @prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
           </vault/settings/prefs.ttl#owner> prefs:<PREDICATE> \"<VALUE>\" .
       "

3. For OPTIONAL predicates (affiliation/role/dates/email/avatar): ask, accept "skip":
   - "Current primary institutional affiliation? (ROR id if known, else display name; skip is OK)"
   - "Role at that affiliation? (skip OK)"
   - "Start date of that affiliation? (YYYY-MM-DD; skip OK)"
   - "Work email? (skip OK)"
   - "Avatar URL? (skip OK)"

   Persist any non-skipped answers via the same PATCH pattern.

4. Validate prefs.ttl against PodOwnerPreferencesShape (offline with pyshacl,
   or trust the substrate to enforce on next write). If MUSTs unsatisfied,
   re-ask the missing field.
```

**Important** (agentInstruction reminder): don't infer or guess proper nouns. CLAUDE.md / project memory may suggest a name or ORCID, but **the prefs file is the owner's authoritative self-declaration**. Ask before persisting.
````

- [ ] **Step 25.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: SetupPodOwner Phase A (prefs elicitation)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 26: Phases B–C — AddressBook contact + optional Org/Membership

- [ ] **Step 26.1: Append**

````markdown

### Phase B — AddressBook Person card

Calls into the **`solid-addressbook`** skill ("Procedure — Pod-owner setup contribution"). The flow:

```
1. Check for existing owner card:
   solid-pod sparql https://pod.vardeman.me/vault/ "
     PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
     PREFIX owl: <http://www.w3.org/2002/07/owl#>
     SELECT ?card WHERE {
       ?card a vcard:Individual ;
             vcard:inAddressBook <https://pod.vardeman.me/vault/contacts/index.ttl#this> ;
             owl:sameAs <https://orcid.org/<prefs:orcid>> .
     }
   " --default-graph-uri https://pod.vardeman.me/vault/contacts/people.ttl
   → if 1+ result, capture <contact-card-IRI> and SKIP step 2.

2. Mint Person card via solid-addressbook procedure:
   - read /vault/meta/templates/contact-create.ttl
   - mint UUIDv4 slug
   - fill <<FULL_NAME>>=prefs:fullName, <<ORCID>>=prefs:orcid
   - solid-pod create /vault/contacts/Person/ --slug <uuid>.ttl ...
   - solid-pod patch /vault/contacts/people.ttl --insert "<#book> vcard:fn ... ; vcard:hasMember ... ."
   - capture <contact-card-IRI> = https://pod.vardeman.me/vault/contacts/Person/<uuid>.ttl#this
```

### Phase C — Optional: Organization + Membership

Run only if `prefs:primaryAffiliationROR` OR `prefs:primaryAffiliationName` present in prefs.ttl.

```
1. Ensure Organization exists:
   if prefs:primaryAffiliationROR present:
       solid-pod sparql ... "SELECT ?org WHERE { ?org owl:sameAs <https://ror.org/<ROR>> . }"
       → if exists, capture <org-IRI>; else mint via org-create template
   else (only name): always mint (no canonical anchor to dedupe against)

2. Mint Membership (always — even if Org existed, this is a new owner-to-org link):
   - check for existing Membership: SPARQL for ?m where ?m org:member <contact-card-IRI> + org:organization <org-IRI>
   - if exists, capture <membership-IRI>; SKIP mint
   - else: read membership-create template, fill placeholders, PUT
   - capture <membership-IRI> = https://pod.vardeman.me/vault/contacts/Membership/<uuid>.ttl#this
```

Phase C is **fully optional** — if the human skips affiliation facts in Phase A, skip Phase C entirely. The WebID enrichment in Phase E omits `org:hasMembership` cleanly.
````

- [ ] **Step 26.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: SetupPodOwner Phases B+C (contact + org/membership)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 27: Phase D — Wiki bridge (optional)

- [ ] **Step 27.1: Append**

````markdown

### Phase D — Optional: wiki Person page + bridge

Ask the human: *"Create the L3 agentic-memory wiki page now? (Recommended — gives LLMs richer context about the Pod owner; can be created later via solid-wiki-memory-l3 if you prefer.)"*

If yes:

```
1. Check for existing wiki page:
   solid-pod read /vault/wiki/people/<prefs:wikiSlug>/index.md
   200 → check its .meta for foaf:primaryTopic <WebID>
         if present: capture <wiki-page-IRI>; SKIP step 2.
         if absent: ask human — overwrite the page's bridge or pick a different slug?
   404 → proceed to mint.

2. Calls into solid-wiki-memory-l3 skill ("Procedure — Create a wiki Person page"):
   - mint markdown body (minimal seed; H1 = prefs:fullName; "Pod-owner agentic-memory record")
   - solid-pod create /vault/wiki/people/ --slug <wikiSlug>/index.md \
       --content-type text/markdown --body "<markdown>" \
       --meta "<> a wiki:Person ; foaf:name <fullName> ; \
               foaf:primaryTopic </vault/profile/card#me> ; \
               owl:sameAs <contact-card-IRI> ."
   - capture <wiki-page-IRI> = /vault/wiki/people/<wikiSlug>/index.md
```

If no: proceed to Phase E without a wiki page IRI. The WebID enrichment omits `foaf:isPrimaryTopicOf` cleanly — it's SHOULD, not MUST, so the shape surfaces a `sh:Warning` but doesn't block.
````

- [ ] **Step 27.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: SetupPodOwner Phase D (wiki bridge)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 28: Phases E + F — WebID enrichment + completion marker

- [ ] **Step 28.1: Append**

````markdown

### Phase E — WebID enrichment

The core. PATCH `/vault/profile/card` with the substrate-shipped template.

```
1. solid-pod read /vault/meta/templates/webid-enrich.ttl
   → capture tmpl:templateBody (with <<FULL_NAME>>, <<ORCID>>, <<CONTACT_CARD>>,
     <<WIKI_PAGE>>, <<MEMBERSHIP>> placeholders)

2. solid-pod read /vault/profile/card  → list existing triples

3. Substitute placeholders from prefs.ttl + Phase B/C/D outputs:
   <<FULL_NAME>>     = prefs:fullName
   <<ORCID>>         = prefs:orcid (bare; template body adds https://orcid.org/ prefix)
   <<CONTACT_CARD>>  = full IRI from Phase B
   <<WIKI_PAGE>>     = full IRI from Phase D  (omit BOTH foaf:isPrimaryTopicOf and the
                       inlined <wiki-page> a wiki:Person triples if Phase D was skipped)
   <<MEMBERSHIP>>    = full IRI from Phase C  (uncomment the optional org:hasMembership
                       triple only if Phase C ran)

4. Filter out duplicates against the current /vault/profile/card content:
   - If pim:preferencesFile already present, drop it.
   - If foaf:Agent already in rdf:type list, drop the `a foaf:Agent` triple.
   - Similarly for foaf:Person, foaf:name (if value identical), etc.

5. solid-pod patch /vault/profile/card --insert "<filtered body>"
   - 200/205 → success
   - 409 → drop the named duplicate triple and retry
   - 422 → parse sh:ValidationReport. sh:Violation findings are MUSTs — fix
           and retry. sh:Warning findings are SHOULDs — report to human, don't
           block.

6. Verify by reading back:
   solid-pod read /vault/profile/card
   → confirm foaf:Agent, foaf:name, pim:preferencesFile, owl:sameAs (ORCID + contact),
     foaf:isPrimaryTopicOf (if Phase D ran), org:hasMembership (if Phase C ran).
```

### Phase F — Mark setup complete

```
solid-pod patch /vault/settings/prefs.ttl --insert "
    @prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
    @prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
    </vault/settings/prefs.ttl#owner> prefs:setupOwnerCompleted true^^xsd:boolean .
"
```

Then report to the human, including:
- WebID IRI: `<pod-url>/vault/profile/card#me`
- Contact card IRI: from Phase B
- Org / Membership IRIs (if Phase C ran)
- Wiki page IRI (if Phase D ran)
- Any `sh:Warning` findings that the human chose to skip — these can be filled in later via incremental PATCH (just rerun this skill against the partial state).

## Failure modes

| Code | Cause | Response |
|---|---|---|
| 404 on prefs file | First-run | PUT skeleton, continue |
| 409 on PATCH | Duplicate insert | Drop duplicate, retry |
| 422 on PUT contact card | SHACL violation | Parse `text/turtle` body, fix, retry |
| 422 on PATCH WebID | Shape violation | Fix MUSTs; surface SHOULDs as advisory |
| Human says "skip" on optional fact | Expected | Continue, omit corresponding triple |
| Human says "skip" on required fact | Setup blocked | Abort with clear message — re-run when ready |
````

- [ ] **Step 28.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: SetupPodOwner Phases E+F + failure modes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 29: Future extensions + Known gaps

- [ ] **Step 29.1: Append**

````markdown

## Future extensions (deferred, not implemented v1)

The owner-identity shape's `sh:agentInstruction` already names these as extension points:

| Extension | Trigger to implement | Notes |
|---|---|---|
| **Verifiable Credentials** (`cred:credentialSubject`) | When VC tooling lands (Inrupt gConsent or equivalent) | The WebID is the subject; VC-gated access via `acp:vc` matchers needs ACP not WAC. |
| **DID-WebID bridge** (D14: `alsoKnownAs <did:web:...>`) | When federation matters | DID Core spec endorses `alsoKnownAs` for DID→other-identifier direction; pair with `owl:sameAs` for the reverse. |
| **ACL ownership** (`acl:owner`) | Phase 6 (WAC/ACP turn-on) | Wires the WebID as resource owner across the Pod. |
| **Multi-WebID Pods** (`solid:account`) | Lab/org-Pod use case | Per-member subtree control via `acl:Control`; org WebID owns the Pod. |

Each is a shape MAY extension + a new template + an incremental skill addition. No substrate restructuring needed.

## Known gaps

- **PATCH is insert-only** (CLI/template limitation). To replace an existing triple (e.g., updating `foaf:name` after a name change), a future `webid-update.ttl` template using `solid:deletes` is needed.
- **Authentication pre-ACL only**. Once Phase 6 enables ACLs, every operation here will require Solid-OIDC + DPoP-bound tokens with the authenticated agent == `/vault/profile/card#me`. CLI client doesn't yet have auth wired (uses plain `fetch()`).
- **`pim:preferencesFile` is private but unenforced**. The substrate marks it private by convention; ACL enforcement lands with Phase 6.
- **Wiki Person slug collisions**. If two Pod owners share a slug (unlikely on a single-owner Pod), the agent should disambiguate before overwriting. This skill's Phase D documents the policy but doesn't enforce it.
````

- [ ] **Step 29.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
git add skills/solid-owner-identity/SKILL.md
git commit -m "[Agent: Claude] solid-owner-identity: Future extensions + Known gaps

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 30: End-to-end run against fresh Pod

**Files:**
- Verify against running Pod (no new code; this is an acceptance test executed manually + telemetry capture).

- [ ] **Step 30.1: Reset Pod to clean state, reapply all overlays**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
make reset           # clean Pod state (verify the Makefile target exists; otherwise: docker compose down -v && docker compose up -d)
~/uvws/.venv/bin/python scripts/overlay/apply.py overlays/wiki-memory https://pod.vardeman.me/vault/
~/uvws/.venv/bin/python scripts/overlay/apply.py overlays/addressbook https://pod.vardeman.me/vault/
~/uvws/.venv/bin/python scripts/overlay/apply.py overlays/owner-identity https://pod.vardeman.me/vault/
```

Expected: each apply runs without error, final state shows all three overlays installed.

- [ ] **Step 30.2: Verify CSS-default WebID present**

```bash
curl -sk https://pod.vardeman.me/vault/profile/card | head -20
```

Expected output includes:
- `foaf:Person`
- `solid:oidcIssuer <https://pod.vardeman.me/>`
- `pim:storage <https://pod.vardeman.me/vault/>`
- `solid:publicTypeIndex <https://pod.vardeman.me/vault/settings/publicTypeIndex>`
- NO `foaf:Agent`, `foaf:name`, `owl:sameAs`, `pim:preferencesFile`, `foaf:isPrimaryTopicOf`, `org:hasMembership`

- [ ] **Step 30.3: Verify `/vault/settings/prefs.ttl` does NOT exist**

```bash
curl -sk -o /dev/null -w "%{http_code}\n" https://pod.vardeman.me/vault/settings/prefs.ttl
```

Expected: `404`.

- [ ] **Step 30.4: Invoke `solid-owner-identity` skill from a Claude Code session**

Open a fresh Claude Code conversation in `~/dev/git/LA3D/agents/solid-agent-skills` and prompt:

> "Set up the Pod owner against https://pod.vardeman.me/vault/."

The skill should:

1. Invoke `solid-owner-identity`, read its SKILL.md instructions.
2. Discover the overlay (Step 1).
3. Read current state (Step 2) — detect CSS-default minimal profile + 404 prefs.
4. Enter SetupPodOwner; Phase A asks for `fullName`, `orcid`, `wikiSlug` — answer with your real values.
5. Phase A asks optional questions (affiliation, role, etc.) — answer at least Notre Dame ROR `00mkhxb43` + role + start date to exercise Phase C.
6. Phase B: agent confirms no existing owner card by ORCID; creates Person card; reports the IRI.
7. Phase C: agent confirms no existing Org by ROR; creates Org card + Membership; reports IRIs.
8. Phase D: agent asks about creating a wiki page — answer yes; agent creates `/vault/wiki/people/<wikiSlug>/index.md` with body + .meta bridge.
9. Phase E: agent reads the webid-enrich template, fills, PATCHes profile/card; on success reports the enrichment.
10. Phase F: agent patches `prefs:setupOwnerCompleted true`; reports completion.

- [ ] **Step 30.5: Verify the final state on Pod**

```bash
echo "--- profile/card (enriched) ---"
curl -sk https://pod.vardeman.me/vault/profile/card

echo "--- prefs.ttl ---"
curl -sk https://pod.vardeman.me/vault/settings/prefs.ttl

echo "--- people.ttl index ---"
curl -sk https://pod.vardeman.me/vault/contacts/people.ttl

echo "--- wiki page .meta ---"
curl -sk https://pod.vardeman.me/vault/wiki/people/<wikiSlug>/index.md.meta
```

Acceptance criteria from the spec:

- `/vault/profile/card` has `foaf:Agent` + `foaf:Person`, `foaf:name`, `pim:preferencesFile`, `owl:sameAs <ORCID>`, `owl:sameAs <contact-card-#this>`, `foaf:isPrimaryTopicOf <wiki-page>`, AND inlined `<wiki-page> a wiki:Person`.
- `/vault/settings/prefs.ttl` has `prefs:setupOwnerCompleted true^^xsd:boolean`.
- `/vault/contacts/Person/<uuid>.ttl` validates against ContactCardShape.
- `/vault/contacts/Membership/<uuid>.ttl` exists.
- `/vault/wiki/people/<wikiSlug>/index.md.meta` declares `wiki:Person` + `foaf:primaryTopic <WebID>` + `owl:sameAs <contact-#this>`.

- [ ] **Step 30.6: Verify idempotence**

Re-prompt the same setup in a new Claude Code conversation:

> "Set up the Pod owner against https://pod.vardeman.me/vault/."

Expected: the skill reads `prefs:setupOwnerCompleted = true`, reports "owner is already set up; here's the current state…", and writes zero new triples. Verify via Memento (or just by comparing `solid-pod read` output before/after — should be byte-identical).

- [ ] **Step 30.7: Capture telemetry**

After the successful end-to-end run, snapshot the agent's conversation transcript (the Claude Code session itself) into the eval workspace:

```bash
# example — adapt to actual harness conventions in solid-agent-skills/eval-workspace
mkdir -p solid-agent-skills/eval-workspace/setup-owner/run-1/
# (manual copy of the Claude Code transcript file here)
```

Notes captured during the run feed back into `sh:agentInstruction` revisions (Step 30.8).

- [ ] **Step 30.8: Iterate on `sh:agentInstruction` text based on observed behavior**

If the agent:
- Asked redundant questions → tighten the elicitation order in `PodOwnerPreferencesShape sh:agentInstruction`
- Skipped a required step → strengthen the wording in the relevant skill SKILL.md procedure
- Dereferenced unnecessary URLs → trim the Step-1 discovery walk

Each substantive edit becomes its own small commit (`[Agent: Claude] tweak: <skill or shape> instruction text based on Run 1 telemetry`).

- [ ] **Step 30.9: Final commit (no code changes, just record sprint completion)**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/solid-agent-skills
# (any iteration commits from Step 30.8 happen separately above; this is just a marker)
echo "End-to-end run against fresh Pod successful at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/superpowers/plans/2026-05-17-pod-owner-setup-skill.md
git add docs/superpowers/plans/2026-05-17-pod-owner-setup-skill.md
git commit -m "[Agent: Claude] setup-owner: end-to-end run completed against fresh Pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

# Part 9 — Wrap-up

## Task 31: Update `cogitarelink-solid/.claude/memory/MEMORY.md`

**Files:**
- Modify: `cogitarelink-solid/.claude/memory/MEMORY.md`

- [ ] **Step 31.1: Add sprint completion note**

Open `cogitarelink-solid/.claude/memory/MEMORY.md`. After the existing "AddressBook substrate + capabilities-only overlay deps — Shipped (2026-05-17)" section, insert:

```markdown
## owner-identity overlay + setup-owner skill suite — Shipped (2026-05-17)

- **`overlays/owner-identity/`** — new substrate overlay above AddressBook. 2
  shapes (PodOwnerWebIDShape spec-grounded against Solid WebID Profile editor
  draft; PodOwnerPreferencesShape as agent<->human elicitation contract). 2
  templates (webid-enrich.ttl — first PATCH-flavor template using
  tmpl:targetResource v1.1; prefs-init.ttl). 5 capability descriptors.
  Resource `.meta` patch on /vault/profile/card adds dct:conformsTo +
  ldp:constrainedBy.
- **`tmpl:targetResource`** predicate added (v1.1) for PATCH templates
  targeting an existing resource (vs. PUT-into-container).
- **Apply.py extension** — `installsResourceMetaPatch` predicate handled in
  manifest parser + applied in apply.py step 11b.
- **Three new agent skills** in solid-agent-skills:
  - `solid-addressbook` — discover, read, create Person/Org/Membership, find
    by 8 affordances. Hardware gotchas documented (absolute inAddressBook IRI,
    flat layout, ORCID anchor preference).
  - `solid-wiki-memory-l3` (minimal scope: Person class + bridge procedure).
    Two-stage commit, full shape coverage, mem:* triggers deferred to
    Memory Structuring Sprint.
  - `solid-owner-identity` — orchestrator. SetupPodOwner Phases A-F with
    full idempotence semantics and failure-mode handling.
- **Follow-the-nose discovery** (A+C combined): webid-enrich template inlines
  `<wiki-page> a wiki:Person` in the WebID response so a single dereference
  reveals the L3 agentic-memory record without extra round-trips.

### Decisions to ratify after first telemetry round

- **D89** — Owner-identity overlay as substrate-level concern (above
  AddressBook + wiki-memory). Justified by forward extensibility to VCs,
  DIDs, ACL ownership.
- **D90** — Agent<->human elicitation via `pim:preferencesFile`
  (`/vault/settings/prefs.ttl`). Spec MUST + per-Pod-owner private resource
  = natural elicitation surface.
```

- [ ] **Step 31.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add .claude/memory/MEMORY.md
git commit -m "[Agent: Claude] memory: owner-identity overlay + setup-owner skill suite shipped

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 32: Add D89 + D90 as candidate decisions

**Files:**
- Modify: `cogitarelink-solid/.claude/skills/decision-lookup/decisions.md` (append)

- [ ] **Step 32.1: Locate the decision index and append**

```bash
ls cogitarelink-solid/.claude/skills/decision-lookup/
```

Append to `cogitarelink-solid/.claude/skills/decision-lookup/decisions.md` two new entries following the existing format (D87/D88 nearby give the template):

```markdown
## D89 — Owner-identity overlay as substrate-level concern

**Status:** Candidate (2026-05-17). Ratify after first end-to-end run + telemetry.

**Decision:** The Pod-owner identity contract (enriched WebID profile per spec + extensibility to VCs, DIDs, ACL ownership) is a distinct substrate concern, not a sub-feature of AddressBook. It gets its own overlay (`overlays/owner-identity/`) above AddressBook in the D87 capability stack.

**Rationale:** Identity stack will grow — VC issuance, DID bridging, ACL ownership are all on the horizon. None of these are AddressBook concerns. Keeping the WebID profile shape + enrichment template in a separate overlay leaves room for that growth without renaming AddressBook's responsibility.

**Implications:** Capability deps: owner-identity *requires* AddressBook (for vcard-individual-substrate and tmpl-vocabulary v1.1) + wiki-memory (for foaf-primarytopic-bridge). Owner-identity *provides* pod-owner-identity, webid-profile-shape, pod-owner-preferences-shape, webid-enrich-template, prefs-init-template.

**See also:** D14, D70, D81, D87, D88.

## D90 — Agent↔human elicitation via `pim:preferencesFile`

**Status:** Candidate (2026-05-17). Ratify after first end-to-end run.

**Decision:** The per-Pod-owner preferences resource (`/vault/settings/prefs.ttl`, declared via `pim:preferencesFile` on the WebID per Solid WebID Profile §4 MUST) is the canonical agent↔human elicitation surface. The substrate ships `PodOwnerPreferencesShape` as the elicitation contract — required fact set + regex patterns drive the agent's one-question-at-a-time walk-through, with persistence after every answer.

**Rationale:** Spec-mandated, private, per-Pod-owner. The natural home for owner-authored facts (name, ORCID, affiliation, slug preferences) that drive substrate-level setup. Avoids inventing a new vocabulary for what the spec already provides.

**Implications:** The `prefs:` vocabulary (11 predicates) is the first owner-prefs-flavor namespace; future sprints extend it for additional setup flows. The `prefs:setupOwnerCompleted` marker enables idempotent re-runs.

**See also:** D7 (sh:agentInstruction), D52 (affordance descriptors), D88 (tmpl: vocab), D89.
```

- [ ] **Step 32.2: Commit**

```bash
cd /Users/cvardema/dev/git/LA3D/agents/cogitarelink-solid
git add .claude/skills/decision-lookup/decisions.md
git commit -m "[Agent: Claude] decisions: candidate D89 (owner-identity overlay) + D90 (prefs elicitation)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

# Self-review

After all 32 tasks complete, verify against the spec sections:

1. **Goal 1** (Pod-owner identity overlay) → Parts 1–5 (Tasks 1–13). ✓
2. **Goal 2** (three agent skills) → Parts 6–8 (Tasks 14–29). ✓
3. **Goal 3** (agent↔human elicitation via `pim:preferencesFile`) → Tasks 4 (PodOwnerPreferencesShape) + 25 (Phase A elicitation). ✓
4. **Goal 4** (follow-the-nose L1→L3 in single dereference) → Tasks 5 (PodOwnerWebIDShape SHOULD includes `foaf:isPrimaryTopicOf`) + 7 (webid-enrich body inlines `<wiki-page> a wiki:Person`). ✓
5. **Verification / acceptance criteria** (substrate apply.py + cold-start agent run + follow-the-nose dereference + idempotence + failure modes) → Tasks 13, 30. ✓
6. **Three-skill split with capability deps** → Task 10 (manifest requires/provides), Tasks 14–29 (each skill's setup-owner contribution clearly delineated). ✓
7. **Spec MUSTs as sh:Violation, SHOULDs as sh:Warning** → Task 5. ✓
8. **`tmpl:targetResource` vocab extension** → Task 1. ✓
9. **`installsResourceMetaPatch` apply.py extension** → Tasks 11–12. ✓
10. **Deferred Memory Structuring Sprint items** → Task 22 (deferred list explicit). ✓
11. **D89 + D90 candidate decisions** → Task 32. ✓

No gaps detected. No placeholders. Property names consistent across tasks (`prefs:setupOwnerCompleted`, `tmpl:targetResource`, `foaf:isPrimaryTopicOf`, etc.). File paths absolute throughout.
