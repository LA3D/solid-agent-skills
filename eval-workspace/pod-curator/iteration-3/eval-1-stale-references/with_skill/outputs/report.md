# pod-curator report — stale container-rename references

**Pod:** https://pod.vardeman.me/vault/  **Date:** 2026-05-24
**Task:** Find references still pointing at renamed wiki containers (pages→concepts, sources merged in) and draft repairs.
**Constraint honored:** audit-and-propose only. Read everything; created only new proposal resources under `working/curator-proposals/`. No existing substrate resource modified, PATCHed, or deleted.

## Work queue
`scripts/pod_audit.py` returned 12 WARN findings. Triage:
- `resolve:seeAlso` wiki/pages/ 404 + wiki/sources/ 404 — in scope → proposal 01
- 8× `descriptor:untyped` (contact/org affordances) — contract gap, not rename → out of scope
- `StorageDescriptionShape:agentInstruction` missing — out of scope

Two stale pointers the auditor MISSED (it resolves only rdfs:seeAlso + catalog pointers, not prof:hasResource), found by walking the storage description:
- prof:hasResource → meta/profiles/source 404 → proposal 02
- prof:hasResource → meta/profiles/procedure 404 → proposal 03

## Ground truth (deployed-Pod precedence)
- Live wiki/ containers: concepts/, people/, places/, events/, organizations/, procedures/, working/ (+ .events/, .operations/, index.md). No pages/, no sources/.
- Type Index: skos:Concept → concepts/ (#reg0) AND wiki:Source → concepts/ (#reg1) — the merge.
- meta/profiles/ members: concept, working, page, organization, template, event, howto, thing, person, place. profiles/source + profiles/procedure absent (404); profiles/howto is the live procedure descriptor; profiles/page present (200).

## Proposals (staged on Pod, D73 two-stage commit)
Container: https://pod.vardeman.me/vault/wiki/working/curator-proposals/2026-05-24T11:47:34Z/  (also saved locally beside this report)

- 01-seealso-pages-sources.ttl — mem:DanglingReference. seeAlso lists pages/+sources/ (404) and omits 4 live containers. Repo-side: overlay storage-patch.ttl already correct; staleness lives in static non-PATCHable css/config/void-description.json (lines 210–229). Delete the two dead blocks, add concepts/places/events/organizations.
- 02-hasresource-source.ttl — mem:DanglingReference (auditor-missed). hasResource → profiles/source (404); concept profile covers wiki:Source post-merge. Repo-side, void-description.json lines 280–289: drop the term.
- 03-hasresource-procedure.ttl — mem:DanglingReference/MovedTarget (auditor-missed). hasResource → profiles/procedure (404); profile renamed to howto (schema:HowTo). Repo-side, line 306: procedure → howto.
- 04-falsepositive-profiles-page.ttl — mem:FalsePositive (withdrawn). profiles/page LOOKS renamed-away but returns 200 and is the root profile all others inherit from (D96). Only the pages/ container was renamed, never the page profile. No repair; recorded for guard auditability.

## Escalations
None — all resolved against deployed-Pod ground truth.

## Out-of-scope auditor findings (noted, not repaired)
- 8× descriptor:untyped addressbook affordances — contract gap; likely need a new query-affordance role (wiki:SearchAffordance is for ?ext= HTTP dispatch, a misfit) via gated class-extension. Deferred.
- Storage-description missing entry-point sh:agentInstruction (D104 sweep). Deferred.

## Auditor-improvement note
pod_audit.py resolves only rdfs:seeAlso + catalog pointers; findings 02/03 (prof:hasResource 404s) escaped it. Recommend extending resolve to prof:hasResource and prof:hasRole targets — the same renames strand the PROF pointers beside seeAlso.
