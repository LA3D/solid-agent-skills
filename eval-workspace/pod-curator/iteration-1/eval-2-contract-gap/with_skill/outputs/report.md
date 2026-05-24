# pod-curator report — AddressBook affordance descriptor contract gap

**Date:** 2026-05-23  **Pod:** https://pod.vardeman.me/vault/
**Mode:** audit-and-propose (read + draft only; nothing applied)
**Finding class:** contract gap (construction, not staleness) — playbook §`descriptor:untyped`

## Summary

The AddressBook contact/org affordances are functional but under-specified as
affordance descriptors. They carry working `sh:agentInstruction` + `wiki:selectQuery`,
but are typed only `wiki:Affordance` (abstract root) and never `prof:ResourceDescriptor`.
Because the governing shape `wiki:AffordanceDescriptorShape` targets `prof:ResourceDescriptor`,
these entries escape the descriptor contract entirely — no required contract predicate is
enforced or present. `wiki-search-grep.ttl` carries the full PROF contract. That is the
"half-finished next to wiki-search-grep" the task flagged.

## Work queue (scripts/pod_audit.py --out-format json)

11 WARN findings total. Contract-gap subset addressed here:

| Constraint | Count | Locations |
|---|---|---|
| descriptor:untyped | 8 | 5 contact-find-* + 2 org-find-* + bridge-card-to-wiki |

Out of scope (left for D104 sweep): 1 StorageDescriptionShape:agentInstruction,
2 resolve:seeAlso danglers (wiki/pages/, wiki/sources/ — D98 rename).

## The gap, precisely

`wiki:AffordanceDescriptorShape` (cogitarelink-solid/shapes/substrate/affordance-descriptor.shacl.ttl)
sh:targetClass prof:ResourceDescriptor; requires on every descriptor:

| Required | wiki-search-grep | contact/org | Status |
|---|---|---|---|
| a prof:ResourceDescriptor (= shape's target selector) | yes | MISSING | escapes shape |
| prof:hasRole (wikirole concept) | yes | missing | |
| rdfs:label (>=3 chars) | yes | missing | |
| dct:conformsTo (PROF spec) | yes | missing | |
| wiki:installedBy (installing overlay) | yes | missing | |
| intent prose (sh:agentInstruction OR dct:description) | yes | present | OK |

The missing `a prof:ResourceDescriptor` is also the shape's target selector, so the
descriptors are invisible to the shape, not merely failing it — SHACL reports them
vacuously conforming. Only pod_audit.py's catalog-walk `descriptor:untyped` check
catches it. Worst failure mode: an ungoverned resource that looks clean.

Verification (pyshacl, inference="none"):
- current untyped descriptor -> not a shape target -> vacuous "conforms" = ungoverned (bug)
- proposed corrected descriptor -> CONFORMS: True, and does NOT trigger
  wiki:SearchAffordanceShape (no wiki:SearchAffordance type added)

## Proposed additions (per descriptor)

Add to each of the 8 (existing sh:agentInstruction + wiki:selectQuery untouched):

    a wiki:Affordance , prof:ResourceDescriptor ;
    prof:hasRole wikirole:affordance ;            # parent role, defined in scheme
    rdfs:label "<human label>" ;
    dct:conformsTo <http://www.w3.org/TR/dx-prof/> ;
    wiki:installedBy <https://pod.vardeman.me/vault/ontology/overlay#addressbook> ;

Labels: Contact Find by Name/Email/ORCID/Affiliation/Group; Organization Find by
Name/ROR; Bridge Card to Wiki Page.

## Deliberately NOT added

These are wiki:selectQuery SPARQL-SELECT read affordances dispatched via `solid-pod invoke`
(src/commands/invoke.ts reads wiki:selectQuery), not HTTP ?ext= surfaces. So NO
wiki:SearchAffordance / wiki:dispatchPattern / wiki:targetContainer — those belong to
wiki-search-grep (governed by the stricter wiki:SearchAffordanceShape). Conflating the
two kinds would wrongly subject these to the dispatch contract.

## Follow-ups (recommendations, not proposals)

1. No ontology subclass exists for SPARQL-SELECT read affordances. The wiki ontology has
   WriteAffordance / DerivedClassAffordance / DerivedNavigationAffordance / VersionAffordance /
   SearchAffordance but nothing for a wiki:selectQuery read affordance. I used the parent
   role wikirole:affordance rather than mint wiki:QueryAffordance + wikirole:query-affordance
   unilaterally (playbook: don't add a new class when extending works; provide reactively).
   If these warrant their own governed kind, propose it via the wiki:ClassExtensionShape
   contract — flagged, not done.
2. wikirole:search-affordance is referenced by wiki-search-grep.ttl but is NOT defined in
   the deployed wikirole scheme (/vault/ontology/wikirole). The reference descriptor's own
   prof:hasRole dangles. Separate dangling-reference finding, out of scope.

## Durability

Descriptors are served from the addressbook overlay source
(cogitarelink-solid/overlays/addressbook/affordances/*.ttl) and reproduced by `make reset`.
A live Pod PATCH would be overwritten on rebuild. The durable fix is repo-side: edit the 8
overlay source files. Each proposal names its repo target and gives the equivalent N3 Patch.

## Proposals drafted (this directory)

Each = mem:RealignAction provenance block + full corrected descriptor + how-to-apply
(repo edit + equivalent N3 Patch), per playbook template. Proposed, not fixed — application
is the gated crystallize step (D73).

- contact-find-by-name.ttl, contact-find-by-email.ttl, contact-find-by-orcid.ttl,
  contact-find-by-affiliation.ttl, contact-find-by-group.ttl, org-find-by-name.ttl,
  org-find-by-ror.ttl, bridge-card-to-wiki.ttl

Intended on-Pod proposal home (NOT written under this task's safety constraint):
/vault/wiki/working/curator-proposals/2026-05-23T22-17-06Z/
