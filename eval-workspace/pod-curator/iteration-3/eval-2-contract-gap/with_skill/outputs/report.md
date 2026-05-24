# pod-curator report — addressbook contact affordances contract gap

**Date:** 2026-05-24 | **Pod:** https://pod.vardeman.me/vault/ | **Mode:** audit-and-propose (no existing substrate resource modified)
**Question:** Are the addressbook contact affordances (`contact-find-by-name` etc.) properly described as affordance descriptors? If not, propose fixes.

## Answer
No. They are half-finished relative to `wiki-search-grep`, and the gap is real, not cosmetic. All eight addressbook lookup affordances plus `bridge-card-to-wiki` are typed only `a wiki:Affordance`. They omit `a prof:ResourceDescriptor`, the type the descriptor contract (`wiki:AffordanceDescriptorShape`) targets via `sh:targetClass prof:ResourceDescriptor`. So they **escape governance entirely** — the contract never fires. Verified with pyshacl (`inference="none"`): the untyped form "conforms" only because nothing matches it. `pod-audit` confirms: 9 × `descriptor:untyped` WARN.

## Work queue (pod-audit, in-scope)
9 × `descriptor:untyped`: contact-find-by-{name,email,orcid,affiliation,group}, org-find-by-{name,ror}, bridge-card-to-wiki. (Also seen but out of scope: 1 storage-description agentInstruction, 2 D98 stale `seeAlso` for wiki/pages/ + wiki/sources/.)

## What each lacks vs the `wiki-search-grep` gold standard
Missing on all nine: `a prof:ResourceDescriptor`; `prof:hasRole`; `rdfs:label`; `dct:conformsTo` (PROF spec); `wiki:installedBy`; a `wiki:queryParameter` contract. They keep only `a wiki:Affordance` + `sh:agentInstruction` + `wiki:selectQuery`.

## The blocker: no existing type/role fits these
They are client-run, parameterized SPARQL SELECT lookups (agent substitutes `$name/$email/$orcid/$org/$group/$ror/$card` into `wiki:selectQuery`, runs it in its own Comunica; Pod has no SPARQL endpoint, D3/D29). None of the five `wiki:Affordance` subclasses honestly fits:
- `wiki:SearchAffordance` needs server-side `?ext=` dispatch (`wiki:dispatchPattern`) — these have none; forcing it trips `SearchAffordanceShape`. Playbook warns against this misfit.
- `wiki:DerivedNavigationAffordance` is for computing navigation *views*, not parameterized entity lookup, and models no parameter contract.
- DerivedClass / Write / Version — N/A.
The `wikirole` scheme has no lookup/query role either. Per the playbook "No existing type or role fits" recipe (D100 / `wiki:ClassExtensionShape` contract generalized to an affordance subclass + role), the honest repair is a **gated extension**, not jamming under the nearest parent. JUDGMENT CALL — flagged for human review.

## Proposals staged (drafts; nothing applied to the Pod)
- `01-extension-query-affordance.ttl` — gated extension (`mem:RealignAction` + additions): new `wiki:QueryAffordance` (`rdfs:subClassOf wiki:Affordance`), new `wikirole:query-affordance` (`skos:broader wikirole:affordance`), and `wiki:QueryAffordanceShape` (requires `wiki:selectQuery` + `wiki:queryParameter` + ≥100-char `sh:agentInstruction`; deliberately NOT `wiki:dispatchPattern`). Repo apply targets named inside.
- `02-retype-addressbook-descriptors.ttl` — `mem:RealignAction` for the 9 descriptors: adds the five contract predicates + `wiki:QueryAffordance` subtype + a `wiki:queryParameter` contract, preserving existing `sh:agentInstruction`/`wiki:selectQuery`. Depends on 01.
- `03-corrected-descriptors.ttl` — complete proposed replacement bodies for all 9 `overlays/addressbook/affordances/*.ttl` (apply, then `make reset`).

## Repair direction (ground-truth precedence)
Resolved against the deployed contract shape `shapes/substrate/affordance-descriptor.shacl.ttl` (operational truth) and the addressbook manifest (`overlay:installsAffordance` lists all 9; `wiki:installedBy` = `…/overlay#addressbook`). Construction contract gap (descriptors predate the 2026-05-23 contract shape), not staleness — repair runs reality → contract. Repo-side (overlay TTLs, reproduced by `make reset`), not an N3 PATCH of the live `.meta`.

## Validation performed
- `wiki:QueryAffordance` conforms to `wiki:ClassExtensionShape` (`inference="none"`): PASS (admissible gated extension).
- All 9 corrected descriptors conform to `AffordanceDescriptorShape` + new `QueryAffordanceShape` (`inference="none"`): PASS.
- Deployed untyped form "conforms" only by never matching `targetClass prof:ResourceDescriptor`: demonstrates the gap is a governance escape.

## Auditor / substrate gaps noted (not repaired)
- `wikirole:search-affordance` is itself dangling: `wiki-search-grep.ttl` cites it via `prof:hasRole`, but the concept is ABSENT from the deployed `wikirole` scheme — even the gold standard points at an undefined role. `pod-audit` did not flag it (it checks `seeAlso`/catalog pointers, not `prof:hasRole` targets). Recommend adding `wikirole:search-affordance` (and `wikirole:query-affordance` if 01 lands) to the scheme, and teaching the auditor to cross-check `prof:hasRole` targets.
- The auditor flags `descriptor:untyped` but cannot pick the role — that reasoning is the curator's job, which is why this was a construction extension, not a mechanical retype.

## Status
All findings PROPOSED, not fixed. Crystallize only after `ClassExtensionShape` validation (done, passing) and higher-trust reviewer approval folding the corrected TTLs into the overlay.
