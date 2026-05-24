# Stale-Reference Audit — wiki container rename (pages->concepts, sources merged)

**Pod**: https://pod.vardeman.me/vault/  |  **Date**: 2026-05-23  |  **Mode**: audit-and-propose only (no substrate writes)

## Summary
Four stale references remain after the `pages -> concepts` rename and the `sources`
merge into `concepts` (D98). All four live in ONE resource: the storage description at
`/vault/.well-known/solid`. Everything else on the live Pod is already migrated
(affordances, context.jsonld, capability catalog, SHACL catalog, Type Index, wiki/index.md body).

The storage description is statically generated (`StaticStorageDescriber` in
`css/config/void-description.json`) and returns 405 on PATCH — it cannot be repaired with
a runtime N3 Patch. The real fix is a config edit + `make reset`.

## What is stale (live Pod), subject <https://pod.vardeman.me/vault/>
| Predicate | Stale value | HTTP | Should be |
|---|---|---|---|
| rdfs:seeAlso | .../wiki/pages/ | 404 | .../wiki/concepts/ |
| rdfs:seeAlso | .../wiki/sources/ | 404 | drop (merged into concepts) |
| prof:hasResource | .../meta/profiles/source | 404 | drop (no source profile; merged into concept) |
| prof:hasResource | .../meta/profiles/procedure | 404 | .../meta/profiles/howto |

## Secondary: seeAlso is also incomplete
After fixing the two stale entries, seeAlso still misses containers that now exist:
`places/`, `events/`, `organizations/`. Recommend adding them in the same edit.

## Root cause — css/config/void-description.json
line 216 seeAlso->wiki/pages/ ; line 226 seeAlso->wiki/sources/ ;
line 286 hasResource->profiles/source ; line 306 hasResource->profiles/procedure.

Stale test fixtures (flagged, not substrate): mem-trigger tests
loadDurableContainers.test.ts (asserts /vault/wiki/sources/ durable),
BoundExceededDetector/UnprocessableWrite/ContradictionDetector use /vault/wiki/pages/ URIs.

## Out of scope (not from the rename)
pod_audit.py also reported 8 descriptor:untyped WARNs on AddressBook affordances
(contact-find-*, org-find-*, bridge-card-to-wiki) — a separate governance gap, not stale paths.

## Proposed fixes (this directory)
- proposed-fix-void-description.diff — the config edit (the real repair)
- proposed-storage-description.ttl  — corrected storage-description triples (target state)
No safe runtime patch exists (405). Repair: edit void-description.json -> make reset ->
re-run pod_audit.py to confirm 0 stale resolve:seeAlso WARNs.

## Verification performed
- /wiki/ children: concepts, events, organizations, people, places, procedures, working (no pages/sources)
- pages/ + sources/ -> 404; all current containers -> 200
- meta/profiles/: concept,event,howto,organization,page,person,place,template,thing,working exist; source+procedure -> 404
- grep of affordances/capabilities/context.jsonld/templates/shapes/TypeIndex/wiki index.md for pages|sources -> clean except storage description
- pod_audit.py independently flagged exactly the two seeAlso 404s
