# pod-curator report — stale references after pages→concepts / sources-merge rename

**Pod:** https://pod.vardeman.me/vault/
**Mode:** audit-and-propose only (no existing substrate/config modified)
**Date:** 2026-05-23
**Proposals on Pod:** `/vault/wiki/working/curator-proposals/20260523T223341Z/`

## Ground truth (false-positive guard — dereferenced first)

- **Type Index** (`/vault/settings/publicTypeIndex`), the routing authority:
  - `skos:Concept` → `/vault/wiki/concepts/`
  - `wiki:Source` → `/vault/wiki/concepts/` (sources MERGED into concepts — confirms owner's recollection)
- Live wiki containers (HTTP 200): `concepts/ people/ places/ events/ organizations/ procedures/ working/`. `pages/` and `sources/` both **404**.
- Live profile descriptors in `/vault/meta/profiles/`: `page concept person place event organization howto working thing template`. No `source`, no `procedure`.

## Root cause: a half-finished D98 migration

The rename was applied to the runtime overlay (`overlays/wiki-memory/storage-patch.ttl`
already lists `concepts/`; manifest installs `profiles/howto`) but NOT to the static
`css/config/void-description.json`. Static `StaticStorageDescriber` terms are additive, so the
merged `.well-known/solid` carries both correct (overlay) and stale (static-config) pointers.
Every stale reference lives in that one static config file. Storage description PATCH returns
405 — all fixes are **repo-side edits**, not Pod PATCHes.

## Work queue

`pod_audit.py` returned 14 WARN findings. Two are the targeted stale container references
(`resolve:seeAlso`). The other 12 are unrelated (addressbook `descriptor:untyped` x10, missing
entry-point `sh:agentInstruction` x1) and not addressed here. A cross-check of the storage
description's `prof:hasResource` list (which the walker does NOT dereference) surfaced two more
stale references the audit missed.

## Findings, classifications, proposed repairs

| # | Stale reference | Class (mem:) | Fix | Proposal |
|---|---|---|---|---|
| 1 | `rdfs:seeAlso → /vault/wiki/pages/` (404) | MovedTarget | repo: void-description.json L210–219 — remove block | 01-seealso-pages.ttl |
| 2 | `rdfs:seeAlso → /vault/wiki/sources/` (404) | SupersededConcept | repo: void-description.json L220–229 — remove block | 02-seealso-sources.ttl |
| 3 | `prof:hasResource → /vault/meta/profiles/source` (404) | SupersededConcept | repo: void-description.json L280–289 — remove block | 03-hasresource-profiles-source.ttl |
| 4 | `prof:hasResource → /vault/meta/profiles/procedure` (404) | MovedTarget | repo: void-description.json L300–309 — rename value procedure→howto (+ delete orphan overlays/wiki-memory/profiles/procedure.ttl) | 04-hasresource-profiles-procedure.ttl |
| 5 | `prof:hasResource → /vault/meta/profiles/page` (200) | FalsePositive | no change — load-bearing root profile | 05-falsepositive-profiles-page.ttl |

Findings 1 & 2 need no replacement term (`concepts/` already advertised by the overlay).
Finding 3: surviving `profiles/concept` descriptor covers the merged type.

### Why finding 5 is withdrawn (the guard)

`profiles/page` shares the "page" token with the renamed container and looks like a casualty.
It resolves 200 and is the root PROF profile every other profile declares `prof:isProfileOf`.
Removing it would break the inheritance chain. Recorded as `mem:FalsePositive` so the guard is
auditable (mirrors the documented profiles/page guard case in the playbook).

## Auditor gaps (feedback to pod_audit.py)

The walker cross-checks `rdfs:seeAlso` + catalog pointers but does NOT dereference
`prof:hasResource` targets, so findings 3 and 4 (both 404) were invisible to it. Recommend
extending the walker to HTTP-check `prof:hasResource` (and `prof:hasArtifact`) targets.

## Disposition

Five proposals recorded as `mem:RealignAction` (finding 5 as `mem:FalsePositive` non-repair)
under `/vault/wiki/working/curator-proposals/20260523T223341Z/`, mirrored in this outputs/ dir.
Each carries a required `mem:rationale`, the ground-truth source (`prov:used`), and a concrete
before/after repair block. Nothing is fixed — all four real findings are PROPOSED repo edits to
`css/config/void-description.json`, pending human apply + `make reset`. No contradictions
required escalation.
