# Proposal 03 — Define the dangling `wikirole:search-affordance` role (audit-blind finding)

**Not flagged by `pod_audit.py`** — surfaced during curator triage while verifying the
roles referenced by Proposal 02. A curator should record it.

**Resource (DO NOT MODIFY directly):** `…/meta/affordances/wiki-search-grep.ttl` (live, correct)
and the role scheme at `…/ontology/wikirole`.
**Source:** `overlays/wiki-memory/vocabulary/wikirole.ttl`

## Finding
`wiki-search-grep.ttl` (the one genuinely-typed `wiki:SearchAffordance`) asserts:
```turtle
prof:hasRole wikirole:search-affordance ;
```
But `wikirole:search-affordance` is **not defined** in the wikirole scheme. The scheme
defines: `affordance, write-affordance, version-affordance, derived-class-affordance,
derived-navigation-affordance, overview, operation-vocabulary, operation-log, event-stream`.
There is no `search-affordance`.

This is a **dangling reference**: `GET …/ontology/wikirole#search-affordance` resolves to
nothing. The SHACL contract doesn't catch it — `prof:hasRole` only requires `nodeKind sh:IRI`,
not that the IRI resolves to a defined `prof:ResourceRole`. So the substrate's own
machine-actionable role registry is missing a concept it advertises.

## Why it matters
The role registry is the discovery surface an agent uses to understand *what kind* of
affordance it is looking at (PROF `prof:hasRole`). A dangling role degrades that surface
silently. It also blocks Proposal 02 from cleanly reusing a "lookup" role — if we add
`query-affordance` we should fix `search-affordance` in the same pass for consistency.

## Proposed addition to `overlays/wiki-memory/vocabulary/wikirole.ttl`
```turtle
:search-affordance
    a owl:NamedIndividual , skos:Concept , prof:ResourceRole ;
    rdfs:isDefinedBy <https://pod.vardeman.me/vault/ontology/wikirole> ;
    skos:inScheme <https://pod.vardeman.me/vault/ontology/wikirole> ;
    skos:broader :affordance ;
    skos:prefLabel "Search affordance" ;
    skos:definition "An affordance dispatched via an HTTP query-string handler (?ext=<name>) that searches a target container server-side and returns OSLC Query 3.0 results — e.g. recursive markdown grep." .
```

## How to apply
1. Add the concept to the wikirole source (sibling of `:write-affordance` etc.).
2. `make reset` to redeploy the vocabulary.
3. Verify `GET …/ontology/wikirole#search-affordance` returns the concept block.

## Recommendation for the audit walker (separate change, not applied here)
Add a curator cross-check: for every `prof:hasRole` object in every catalog descriptor,
assert the role IRI is `skos:inScheme` the wikirole ConceptScheme. This turns a silent
dangling reference into a WARN. Same pattern would catch a future Proposal-02 typo. This is
a *recommendation* for `scripts/pod_audit.py`, drafted in Proposal 06.
