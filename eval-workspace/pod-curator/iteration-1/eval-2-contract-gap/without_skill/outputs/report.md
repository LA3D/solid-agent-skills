# Contract-gap audit: AddressBook contact/org affordance descriptors

**Date:** 2026-05-23
**Mode:** audit-and-propose only (no live substrate modified)
**Scope:** the 5 `contact-find-by-*` + 2 `org-find-by-*` affordance descriptors at
`/vault/meta/affordances/`, compared against the self-describing standard set by
`wiki-search-grep.ttl`, `markdown-projection.ttl`, and `crystallize.ttl`.

## Verdict

They are **not** properly described as affordance descriptors. They are functional SPARQL
snippets wearing the abstract `wiki:Affordance` type, but they omit nearly every
self-description field the substrate's own ontology says an affordance descriptor must
carry. Next to `wiki-search-grep.ttl` (2716 bytes, fully PROF-typed) the contact ones
(~1.0-1.4 KB) are visibly half-finished.

## What's under-specified

| Self-description field | wiki-search-grep / crystallize | contact-* / org-* | Gap |
|---|---|---|---|
| Concrete `rdf:type` subclass | `wiki:SearchAffordance` / `wiki:WriteAffordance` | abstract `wiki:Affordance` only | Yes - ontology scopeNote says "Use a concrete subclass" |
| `prof:ResourceDescriptor` | present | absent | Yes - not discoverable as a PROF descriptor |
| `dct:conformsTo` (PROF / OSLC) | present | absent | Yes |
| `prof:hasRole` | `wikirole:search-affordance` | absent | Yes |
| `rdfs:label` / `rdfs:comment` | present | absent | Yes - catalog listing has no title |
| `wiki:installedBy` | `overlay#wiki-memory` | absent | Yes - install provenance lost |
| Source graph as DATA | `wiki:targetContainer </vault/wiki/>` | only in prose | Yes - agent must NL-parse instruction for `</vault/contacts/people.ttl>` |
| Parameter surface as DATA | `wiki:queryParameter [...]` x3 | only `$name` etc. in SPARQL string | Yes - can't enumerate params, required-ness, string-vs-IRI |
| `sh:agentInstruction` | present | present | OK (the one thing they got right) |
| `wiki:selectQuery` | present | present | OK |

Net: the only machine-usable parts today are `sh:agentInstruction` and `wiki:selectQuery`.
Everything that makes the descriptor discoverable and typed - the PROF layer, the role,
the installedBy provenance, the structured source + parameter declarations - is missing.

## Two ontology-level gaps surfaced during the audit

1. **No concrete subclass fits these.** The wiki affordance subclasses are
   `WriteAffordance`, `DerivedClassAffordance`, `DerivedNavigationAffordance`,
   `VersionAffordance`, `SearchAffordance`. None covers a parameterized client-run
   SPARQL-SELECT lookup over a fixed source graph. `SearchAffordance` is specifically an
   HTTP query SURFACE with a `dispatchPattern` URL suffix executed server-side - not what
   the contact lookups are. So they defaulted to the abstract root class.

2. **`wikirole:search-affordance` is a dangling reference.** `wiki-search-grep.ttl`
   already does `prof:hasRole wikirole:search-affordance`, but that concept is NOT defined
   in the wikirole scheme (verified: only `:affordance`, `:write-affordance`,
   `:version-affordance`, `:derived-class-affordance`, `:derived-navigation-affordance`,
   `:overview`, `:operation-vocabulary`, `:operation-log`, `:event-stream`). So even the
   reference descriptor has a latent defect. Any role the contact descriptors adopt is
   likewise undefined today.

## Proposed fix

### Vocabulary prerequisites (additive, non-breaking)
- `wiki-ontology.additions.proposed.ttl` - adds `wiki:QueryAffordance` (subclass of
  `wiki:Affordance`) for parameterized client-run SELECT lookups, scopeNote distinguishing
  it from `SearchAffordance` and `DerivedNavigationAffordance`.
- `wikirole.additions.proposed.ttl` - defines `wikirole:query-affordance` (for the new
  class) AND `wikirole:search-affordance` (fixing the existing dangling reference).

### Descriptor uplift (worked examples)
- `contact-find-by-name.proposed.ttl` - canonical string-parameter case.
- `org-find-by-ror.proposed.ttl` - IRI-parameter, cross-resource-enumeration case.

Each adds: `wiki:QueryAffordance` + `prof:ResourceDescriptor` typing, `dct:conformsTo`,
`prof:hasRole wikirole:query-affordance`, `rdfs:label`+`rdfs:comment`,
`wiki:installedBy overlay#addressbook`, `wiki:targetContainer` (source graph as data), and
`wiki:queryParameter` blank node(s) enumerating each parameter - preserving the existing
`sh:agentInstruction` prose and `wiki:selectQuery` verbatim. The other five
(`contact-find-by-email`, `-orcid`, `-affiliation`, `-group`, `org-find-by-name`) follow
the identical pattern; only targetContainer, parameter list, label, and IRI-vs-string note
differ. Mechanical once the two examples are accepted.

## Caveats / NOT fixed here

- **`solid-pod invoke` cannot run these regardless.** `invoke.ts` extracts the query and
  runs it as-is - it has NO parameter substitution for `$name`/`$email`, and its hardcoded
  `WIKI_NS` still carries the stale `:3000` port that no longer matches the descriptors'
  port-less namespace (D84). CLI bugs in solid-agent-skills, out of scope for a descriptor
  audit but flagged for follow-up. Means the proposed `wiki:queryParameter` declarations
  are currently consumed by a reasoning agent, not by `invoke`.
- All proposals validated to parse as Turtle (rdflib, 14/14/7/16 triples). NOT
  SHACL/reasoner-checked against the live ontology; nothing written to the Pod.
- Adding `wiki:QueryAffordance` vs reusing `SearchAffordance` loosely is a judgment call.
  Recommendation: add the subclass - keeps server-side-surface semantics distinct from
  client-run SELECTs.

## Files in this directory
- `report.md` - this report
- `contact-find-by-name.proposed.ttl` - uplifted descriptor (worked example 1)
- `org-find-by-ror.proposed.ttl` - uplifted descriptor (worked example 2)
- `wiki-ontology.additions.proposed.ttl` - `wiki:QueryAffordance` class
- `wikirole.additions.proposed.ttl` - `query-affordance` + `search-affordance` roles
