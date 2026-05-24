# Proposal 04 — Add `wiki:QueryAffordance` class + `wikirole:query-affordance` role (optional, supports Proposal 02)

**Optional.** Only needed if Proposal 02 types the 8 SELECT-lookup descriptors with a
purpose-specific subtype rather than the generic parent. Recommended because it makes the
contact/org lookups discoverable as a distinct kind (client-side SPARQL SELECT) vs.
`wiki:SearchAffordance` (server-side `?ext=` HTTP dispatch).

**Sources:** `overlays/wiki-memory/vocabulary/wiki.ttl` (class), `…/wikirole.ttl` (role).

## Why a new subtype
The substrate currently has these affordance subtypes: `WriteAffordance`, `SearchAffordance`,
plus the derived-view kinds. The 8 addressbook lookups fit none cleanly — they are
**client-executed SPARQL SELECT** affordances (no server handler, no `?ext=`, invoked with
`--default-graph-uri` sources). Conflating them with `SearchAffordance` would falsely promise
an HTTP dispatch endpoint and trip `SearchAffordanceShape`'s `dispatchPattern` requirement.

## Proposed class (in `wiki.ttl`)
```turtle
wiki:QueryAffordance
    a rdfs:Class , owl:Class ;
    rdfs:subClassOf wiki:Affordance ;
    rdfs:isDefinedBy <https://pod.vardeman.me/vault/ontology/wiki> ;
    rdfs:label "Query affordance" ;
    rdfs:comment "A client-executed SPARQL SELECT affordance carrying a wiki:selectQuery. Invoked via `solid-pod invoke` / Comunica with explicit --default-graph-uri sources (RQ-Pod-4). Distinct from wiki:SearchAffordance, which is dispatched server-side via an ?ext= handler." .
```

## Proposed role (in `wikirole.ttl`)
```turtle
:query-affordance
    a owl:NamedIndividual , skos:Concept , prof:ResourceRole ;
    rdfs:isDefinedBy <https://pod.vardeman.me/vault/ontology/wikirole> ;
    skos:inScheme <https://pod.vardeman.me/vault/ontology/wikirole> ;
    skos:broader :affordance ;
    skos:prefLabel "Query affordance" ;
    skos:definition "An affordance carrying a SPARQL SELECT (wiki:selectQuery) executed client-side over explicitly-named .meta / card sources. Used by the addressbook lookups (find-by-name/orcid/email/affiliation/group/ror) and the card→wiki bridge." .
```

## Subclass-closure consideration (per `conceptual_structure_as_extensible_data`)
`wiki:QueryAffordance rdfs:subClassOf wiki:Affordance` is the right shape: the substrate
reasons over the subclass closure, so any future shape targeting `wiki:Affordance` will also
govern `QueryAffordance` instances. This is the D100→D104 generalization — extending the
class hierarchy is itself recorded data, ideally gated by `wiki:ClassExtensionShape`. If you
want the extension to be a *recorded agent action*, announce it in `.operations/` as a
`mem:RealignAction` rather than a silent vocab edit.

## How to apply
1. Add the class to `wiki.ttl`, the role to `wikirole.ttl`.
2. Apply Proposal 02 (which references both).
3. `make reset`; re-run `make audit`.

## If you prefer NOT to add vocab
Skip this proposal. In Proposal 02, type the 8 descriptors `wiki:Affordance` +
`prof:ResourceDescriptor` with `prof:hasRole wikirole:affordance` (the existing parent
concept). The base `AffordanceDescriptorShape` passes either way; you lose only the finer
discoverability distinction.
