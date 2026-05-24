# Stale-Reference Audit — Pod Curator (iteration-3, eval-1, without_skill)

**Pod:** https://pod.vardeman.me/vault/
**Date:** 2026-05-24
**Mode:** audit-and-propose. Read-only against existing substrate; no PATCH/PUT/DELETE applied to any existing resource. All repairs staged as proposals.

## What the rename was

The wiki containers were reorganized:
- `/wiki/pages/` -> renamed to `/wiki/concepts/`
- `/wiki/sources/` -> merged into `/wiki/concepts/` (no standalone sources container anymore)

Confirmed live containers: `/wiki/{concepts,people,places,events,organizations,procedures,working}/`.
`/wiki/pages/` and `/wiki/sources/` both return 404.

## What's stale (4 broken pointers, all in one resource)

Every stale pointer is in the storage description (`/vault/.well-known/solid`). Two predicates carry dead references:

| # | Predicate | Stale value | Status | Correct value |
|---|-----------|-------------|--------|---------------|
| 1 | rdfs:seeAlso | .../wiki/pages/ | 404 | .../wiki/concepts/ |
| 2 | rdfs:seeAlso | .../wiki/sources/ | 404 | (drop — merged into concepts) |
| 3 | prof:hasResource | .../meta/profiles/source | 404 | (drop — no source profile; sources are concepts) |
| 4 | prof:hasResource | .../meta/profiles/procedure | 404 | .../meta/profiles/howto |

The seeAlso list has no entry for the rename target `/wiki/concepts/` — the proposal adds it so the live concepts container is advertised.

Pointer #4 is not strictly a rename artifact (the live profile uses the `howto` token: `/meta/profiles/procedure` = 404 vs `/meta/profiles/howto` = 200), but it is the same class of dangling pointer and was caught in the same sweep.

## Tooling notes (engineering feedback)

- `pod_audit.py` caught #1 and #2 (its `resolve:seeAlso` check) but missed #3 and #4 — the walker does not resolve `prof:hasResource` targets. Found those via a manual sweep of the full storage description. Recommended walker enhancement: extend the resolve check to `prof:hasResource` (and other URL-valued predicates in the storage description).
- The walker's 8 `descriptor:untyped` WARNs (AddressBook affordances missing `a prof:ResourceDescriptor`) are a separate governance gap, NOT stale references — out of scope for this rename audit but recorded in `pod-audit-raw.json`.

## What is NOT stale (verified, do not touch)

- Type Index (`/settings/publicTypeIndex`): already correct. Routes both skos:Concept and wiki:Source to `/wiki/concepts/`. The merge is properly reflected here.
- `meta/profiles/page` (root page profile): exists (200). The concept profile `prof:isProfileOf` it. Not stale despite the pages->concepts rename — wiki:Page is the superclass, wiki:Concept extends it.
- `context.jsonld` Page/Source term mappings: legitimate vocabulary terms (wiki:Source re-introduced via the class-extension contract). Class names, not paths.
- `wiki/index.md`: references `meta/shapes/page.shacl.ttl` and `meta/profiles/page`, both 200. Clean.
- SHACL catalog (`meta/shapes/shacl.ttl`): class-targeted (D78), no container-path references to break.

## Why the proposals are not applied to the live Pod

The storage description is served statically from Components.js (`css/config/void-description.json`); runtime PATCH returns 405 (D44, MEMORY.md). So the authoritative repair edits the config source and rebuilds (`make reset`) — that is proposal 03. Proposals 01/02 are the equivalent logical N3 Patches (illustrative; would 405 against the static resource).

## Staged proposals (in proposals/)

- `01-storage-description-seeAlso.n3patch.proposed` — fix the two dead rdfs:seeAlso paths
- `02-storage-description-hasResource.n3patch.proposed` — fix the two dead prof:hasResource profiles
- `03-void-description-config.diff.proposed` — THE REAL FIX: config-source diff + rebuild + verify steps

Raw audit output: `pod-audit-raw.json`.
