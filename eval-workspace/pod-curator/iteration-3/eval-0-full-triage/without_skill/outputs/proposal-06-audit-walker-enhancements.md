# Proposal 06 — `pod_audit.py` walker enhancements (tooling, not substrate)

Recommendations for `scripts/pod_audit.py` itself, prompted by two findings the current
walker missed (Proposals 03 and 05). These are **tooling changes** — they touch the
audit script, not the live Pod — so they're outside the no-modify-substrate constraint, but
I'm drafting rather than applying, consistent with the audit-and-propose scope.

## Gap 1 — role references aren't validated against the wikirole scheme
Proposal 03's dangling `wikirole:search-affordance` passed every existing check because
`prof:hasRole` is constrained only to `sh:nodeKind sh:IRI`. The walker never confirms the
role IRI resolves to a defined `prof:ResourceRole`.

**Proposed check (HTTP cross-check, the walker's existing idiom):**
1. Fetch the wikirole scheme once (`…/ontology/wikirole`), collect all subjects with
   `skos:inScheme <…/wikirole>`.
2. For each catalog descriptor, for each `prof:hasRole` object, WARN if the object is in the
   wikirole namespace but not in that set: `role:undefined — prof:hasRole points at an
   undefined wikirole concept`.

This mirrors the existing `resolve:*` HTTP cross-checks (SHACL can't express
"resolves to a defined concept", so it belongs in the walker, not the shapes).

## Gap 2 — `wiki:installedBy` resolvability isn't checked
Proposal 05's `overlay#*` IRIs 404. Add an **INFO** (not WARN — opacity may be intentional):
- For each descriptor's `wiki:installedBy` object, HEAD-check; if not 200, emit
  `provenance:installer-opaque — wiki:installedBy does not dereference (got <code>);
  confirm intentional (opaque provenance IRI) or publish the overlay descriptor.`

## Gap 3 — seeAlso vs Type Index consistency (optional, higher-value)
The walker already HEAD-checks `seeAlso` targets (caught the `pages/`/`sources/` 404s). A
stronger check: cross-reference `seeAlso` against the Type Index `solid:instanceContainer`
set. A container that's a routing target but missing from `seeAlso` (e.g. `concepts/`,
`places/`, `events/`, `organizations/` were missing from the live `seeAlso`) is an
under-advertised container — WARN `seeAlso:incomplete`. This would have flagged the *missing*
containers, not just the *dead* ones.

## Note on the existing `inference="none"` discipline
Keep it. The walker correctly forces `inference="none"` so RDFS entailment can't mask
missing-predicate/rooting violations (the `ClassExtensionShape` rationale in FOLLOWUPS).
None of the above checks need entailment — they're HTTP cross-checks over explicit triples.

## Not applied
All three are drafted only. They are low-risk, test-coverable additions; suggest adding a
fixture-based test per check (the `agentic-development.md` "agreement contract" pattern)
before wiring into `make audit`.
