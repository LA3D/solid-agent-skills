# Audit: AddressBook contact affordance descriptors vs wiki-search-grep

Date: 2026-05-24. Scope: audit-and-propose. No existing resource was modified.

## Question
Are the AddressBook contact affordances (contact-find-by-*, org-find-by-*) properly
described as affordance descriptors, the way wiki-search-grep is?

## Short answer
No. They invoke a legitimate mechanism (wiki:selectQuery — client-side SPARQL, same family
as hub-view's wiki:constructQuery), but as PROF ResourceDescriptors they are badly
under-described. Compared with wiki-search-grep.ttl (and link.ttl, hub-view.ttl), all seven
contact/org descriptors are missing the metadata that makes an affordance discoverable,
self-typed, and machine-classifiable. They read as half-finished: a body (sh:agentInstruction
+ a query) with no head (typing, role, provenance, parameter schema).

## Descriptors audited
contact-find-by-name, -email, -orcid, -affiliation, -group, org-find-by-name, org-find-by-ror
(all under https://pod.vardeman.me/vault/meta/affordances/). Sizes ~1.0-1.4 KB each vs
wiki-search-grep at 2.7 KB — the byte gap mirrors the metadata gap.

## Gap table: contact descriptor vs wiki-search-grep reference

| Property | wiki-search-grep | link / hub-view | contact-find-by-* | Why it matters |
|---|---|---|---|---|
| prof:ResourceDescriptor type | yes | yes | NO (only wiki:Affordance) | Invisible to PROF discovery (D86); not a profile artifact |
| Specific affordance class | wiki:SearchAffordance | Write/DerivedClass | NO (bare wiki:Affordance) | Can't tell a SPARQL lookup from a search/write affordance |
| prof:hasRole wikirole:* | search-affordance | write-affordance etc | NO role | Not classifiable/filterable by role |
| dct:conformsTo | PROF + OSLC | PROF | NO | No standard claimed |
| rdfs:label / dct:title | yes | yes | NO | No display name in catalog listings |
| rdfs:comment / dct:description | yes | yes | NO | No one-line summary |
| wiki:installedBy <overlay#..> | wiki-memory | wiki-memory | NO | Loses provenance; overlay#addressbook exists but is unreferenced |
| Parameter schema (wiki:queryParameter) | yes (3 params) | n/a | NO | $name/$email/$orcid/$org/$group/$ror described only in prose; not machine-readable |
| wiki:targetContainer (data scope) | </vault/wiki/> | n/a | NO | "use people.ttl as --default-graph-uri" is prose only, not machine-readable |
| wiki:requiresCapability | n/a | hub-view links it | NO | contact-discovery capability exists but descriptors don't link back |
| Subject node | <> (relative, portable) | <> | </vault/meta/affordances/X.ttl> (abs path, no host) | Inconsistent + fragile vs every other descriptor |

## Empirical confirmation
`solid-pod invoke https://pod.vardeman.me/vault/ contact-find-by-name` ->
  "error": "Affordance contact-find-by-name has no wiki:constructQuery or wiki:selectQuery"
The descriptor DOES carry wiki:selectQuery. The failure is a SEPARATE pre-existing CLI bug
(Defect B below) — but it means today no invoke call succeeds against any descriptor.

## Two distinct defects
Defect A (the audit subject): descriptor under-description. Fixable on the Pod by re-issuing
each descriptor with full PROF/typing/role/parameter metadata. 7 corrected .ttl proposals
drafted + a new query-affordance role.

Defect B (pre-existing, out of audit scope but blocks Defect A's value): solid-pod invoke
namespace mismatch. src/commands/invoke.ts:9 hardcodes
WIKI_NS = 'https://pod.vardeman.me:3000/vault/ontology/wiki#' (with :3000 port). Every live
descriptor uses the port-less https://pod.vardeman.me/vault/ontology/wiki#. So lines 44-45
never match the query predicate and invoke fails for ALL affordances, not just contacts.
Also violates D84 (port-less HTTPS). Drafted as a recommendation, not applied.

## Note on query mechanism (not a defect)
The contact descriptors use wiki:selectQuery (client-side SPARQL) rather than
wiki-search-grep's HTTP wiki:dispatchPattern. That is a legitimate, different mechanism
(hub-view uses wiki:constructQuery the same way). The gap is the missing descriptor
metadata, NOT the choice of query type. The proposals preserve each query verbatim.

## Recommendations
1. Re-issue the 7 contact/org descriptors with full metadata (the actual half-finished fix).
2. Add wikirole:query-affordance (a parameterized SPARQL lookup is a distinct kind from
   the HTTP-dispatch search-affordance). Optionally a sibling wiki:QueryAffordance class.
3. Fix invoke.ts WIKI_NS to the port-less IRI — otherwise corrected descriptors still
   won't invoke. Add $-parameter binding using the new wiki:queryParameter schema (follow-up).

## Proposals staged in this directory
- proposal-contact-find-by-name.ttl   (fully-described worked exemplar)
- proposal-contact-find-by-email.ttl
- proposal-contact-find-by-orcid.ttl
- proposal-contact-find-by-affiliation.ttl
- proposal-contact-find-by-group.ttl
- proposal-org-find-by-name.ttl
- proposal-org-find-by-ror.ttl
- proposal-wikirole-query-affordance.ttl  (additive SKOS concept for the role)
- proposal-invoke-ts-fix.md               (Defect B CLI fix, recommendation only)

All drafts. Nothing written to the Pod or to repo source.
