# pod-curator triage report — https://pod.vardeman.me/vault/

Date: 2026-05-24. Mode: audit-and-propose (read + create only; no existing resource modified, PATCHed, or deleted).

## Work queue (from `scripts/pod_audit.py --out-format json`)

11 findings, all `WARN`, in two constraint families:

| Constraint | Count | Locations |
|---|---|---|
| `resolve:seeAlso` | 2 | storage description -> `wiki/pages/`, `wiki/sources/` |
| `descriptor:untyped` | 9 | 8 contact/org lookup descriptors + `bridge-card-to-wiki.ttl` |

Plus **2 findings the auditor missed** (found by walking the whole flagged resource, per the skill): two `prof:hasResource` targets in the same storage description that 404. Noted as an auditor gap below.

## Findings, classification, and repair direction

### Cluster 1 — storage-description dangling pointers -> Proposal 01 (`mem:DanglingReference`)
`.well-known/solid` points `rdfs:seeAlso` at `wiki/pages/` and `wiki/sources/` — both **404**. D98 renamed these: `wiki:Concept` and `wiki:Source` both route to `wiki/concepts/` (confirmed in Type Index reg0 + reg1). Live container set: `concepts/ people/ places/ events/ organizations/ procedures/ working/`.

Walking the whole resource surfaced two more dead pointers the walker did not flag: `prof:hasResource -> meta/profiles/source` (404) and `-> meta/profiles/procedure` (404). Live profile set: `page` (root), `concept`, `person`, `working`.

**False-positive guard applied:** confirmed `meta/profiles/page` *is* load-bearing — the root profile every other `prof:isProfileOf` inherits from — resolves 200, left untouched (the exact case the playbook warns about).

**Repair direction:** pointer -> deployed reality. All four live in the **static `css/config/void-description.json`** (the `storage-patch.ttl` overlay already emits the correct `concepts/` seeAlso, so the static config is the lagging source). **Repo edit, not N3 Patch** — the storage description is assembled statically, not HTTP-PATCHable. Proposal 01 names the exact JSON blocks (lines 210-219, 220-229, 280-289, 300-309) and flags one owner decision: whether a `procedure` profile is wanted (deploy `meta/profiles/procedure`, else drop the pointer).

### Cluster 2 — 9 untyped affordance descriptors -> Proposals 02 + 03 (contract gap / gated extension)
The 8 contact/org lookups and the card->wiki bridge are typed only `a wiki:Affordance`, escaping the `prof:ResourceDescriptor` contract (no role / label / `dct:conformsTo` / `wiki:installedBy`). All 9 are **client-run parameterized SPARQL-SELECT** affordances.

**Honest-fit problem (judgment call, flagged for human review):** no existing subtype/role fits.
- `wiki:SearchAffordance` is `?ext=` HTTP-dispatch substring search — the playbook explicitly warns these SELECT affordances are **not** that.
- `wiki:DerivedNavigationAffordance` carries `wiki:selectQuery` too but means "compute a derived *view*" — lookup-by-key is retrieval, not a view.

Per the class-extension contract (D100 / `wiki:ClassExtensionShape`), repair is a **gated extension**, not a misfit:
- **Proposal 02** adds `wiki:QueryAffordance` (subClassOf `wiki:Affordance`) + `wikirole:query-affordance` (broader `wikirole:affordance`). Prerequisite for 03; flagged for explicit approval.
- **Proposal 03** types all 9 `wiki:QueryAffordance, prof:ResourceDescriptor` with `prof:hasRole wikirole:query-affordance`, `rdfs:label`, `dct:conformsTo` (PROF), `wiki:installedBy` (addressbook overlay for contact/org; wiki-memory for bridge). Existing `sh:agentInstruction` + `wiki:selectQuery` preserved verbatim — additive only. Repo-side: refold into owning overlays so `make reset` reproduces.

## Escalations / second-order findings (no `mem:ContradictionDetected` — no irreconcilable conflicts)

1. **Dangling role (latent, fix with Proposal 02):** the already-typed `wiki-search-grep.ttl` cites `prof:hasRole wikirole:search-affordance`, but that concept is **absent** from the scheme. Proposal 02 recommends adding it in the same vocab edit.
2. **Auditor gap (feed back):** `pod_audit.py` checks `rdfs:seeAlso` + catalog pointers but **not** `prof:hasResource` / `prof:hasRole`. Two dead `prof:hasResource` pointers + the dangling role went unflagged. Recommend extending the walker to resolve `prof:hasResource` and verify each `prof:hasRole` against the wikirole scheme.

## Proposals staged

All as `mem:RealignAction` activities (template from `overlays/wiki-memory/examples/realign-2026-05-23.ttl`), each with required `mem:rationale` + `prov:used` encoding ground-truth precedence.

Local: `.../with_skill/outputs/` — `01-storage-description-dangling-pointers.ttl`, `02-query-affordance-extension.ttl`, `03-type-untyped-descriptors.ttl`, `report.md`.

On Pod (two-stage commit, D73 — proposed, **not** crystallized): `https://pod.vardeman.me/vault/wiki/working/curator-proposals/2026-05-24T11-47-33Z/{01,02,03}-*.ttl` (all verified 200).

## Status

Nothing is **fixed** — everything is **proposed**. Crystallization (repo edits in 01/03, gated vocab extension in 02) needs human / higher-trust review. Proposal 03 is gated on 02 being approved first.
