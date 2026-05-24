# pod-curator report — addressbook contact/org affordance descriptors

**Date:** 2026-05-23T22:34:01Z
**Pod:** https://pod.vardeman.me/vault/
**Mode:** audit-and-propose only (no substrate mutated)
**Verdict:** confirmed — the contact/org affordances are under-specified. Functional but ungoverned: they carry working query bodies but escape the descriptor contract that `wiki-search-grep` satisfies.

## Work queue

Ran `scripts/pod_audit.py https://pod.vardeman.me/vault/ --shapes-dir shapes/substrate/`.
14 findings, all `WARN` (0 ERROR). Relevant to this task:

| Count | Constraint | Locations |
|---|---|---|
| 8 | `descriptor:untyped` | `contact-find-by-{name,email,orcid,affiliation,group}`, `org-find-by-{name,ror}`, `bridge-card-to-wiki` |

Other findings (`StorageDescriptionShape:agentInstruction`, two `resolve:seeAlso` 404s on `wiki/pages/` + `wiki/sources/`) are pre-existing D104-sweep items, out of scope here.

## What is wrong

Compared against the reference descriptor `wiki-search-grep.ttl`, each contact/org descriptor is typed only `a wiki:Affordance` — the **abstract root class**. The ontology's own `skos:scopeNote` on `wiki:Affordance` says *"Use a concrete subclass."* It is not typed `prof:ResourceDescriptor`, so it falls outside `wiki:AffordanceDescriptorShape` entirely (that shape `sh:targetClass prof:ResourceDescriptor`). That is exactly why `pod-audit` reports `descriptor:untyped` — the entry escapes governance.

### Missing predicates (every one of the 8)

| Predicate | Required by | wiki-search-grep | contacts |
|---|---|---|---|
| `a prof:ResourceDescriptor` | target of base shape | yes | **no** |
| concrete `wiki:*Affordance` subtype | ontology scopeNote | `wiki:SearchAffordance` | **no** (bare root) |
| `prof:hasRole` | AffordanceDescriptorShape | yes | **no** |
| `rdfs:label` (>=3 chars) | AffordanceDescriptorShape | yes | **no** |
| `dct:conformsTo` | AffordanceDescriptorShape | yes | **no** |
| `wiki:installedBy` | AffordanceDescriptorShape | yes | **no** |
| intent prose | AffordanceDescriptorShape (`sh:or`) | `sh:agentInstruction` | yes ✓ |

They satisfy exactly one of five contract requirements (intent prose). The query body (`wiki:selectQuery`) and instruction prose are good and were preserved verbatim.

## The deeper gap — no honest type/role existed

Checked whether an existing subtype/role fits (playbook: don't force a misfit). None does:

- **`wiki:SearchAffordance`** is `?ext=` server-side HTTP dispatch; `SearchAffordanceShape` would (correctly) demand `wiki:dispatchPattern` + `wiki:targetContainer` these queries don't have.
- **`wiki:DerivedClassAffordance` / `DerivedNavigationAffordance`** compute a derived class / nav view over the *wiki* containers; these are parameterized **entity lookups over the contacts graph**.
- **`wiki:WriteAffordance` / `VersionAffordance`** — unrelated.
- The **wikirole scheme has no role** for client-run parameterized SELECT.

These 8 are a distinct kind: a **parameterized, client-run SPARQL SELECT** (bind `$param`, run in the agent's own engine against a named graph — the Pod has no endpoint). Per the playbook's *"no existing type or role fits"* recipe, the repair is a **gated conceptual-structure extension**, not jamming them under the nearest parent.

## Proposals drafted

All land under `/vault/wiki/working/curator-proposals/2026-05-23T223401Z/`. Nothing PATCHed.

| File | What it proposes |
|---|---|
| `00-extension-query-affordance.ttl` | **Gated extension (HUMAN-REVIEW).** New class `wiki:QueryAffordance` (`rdfs:subClassOf wiki:Affordance`) + role `wikirole:query-affordance` (`skos:inScheme` wikirole, `skos:broader :affordance`). Also adds the missing `wikirole:search-affordance` role (auditor gap below). |
| `contact-find-by-name.ttl` | corrected descriptor |
| `contact-find-by-email.ttl` | corrected descriptor |
| `contact-find-by-orcid.ttl` | corrected descriptor |
| `contact-find-by-affiliation.ttl` | corrected descriptor |
| `contact-find-by-group.ttl` | corrected descriptor |
| `org-find-by-name.ttl` | corrected descriptor |
| `org-find-by-ror.ttl` | corrected descriptor |
| `bridge-card-to-wiki.ttl` | corrected descriptor (same gap, same overlay cluster) |
| `realign-contact-affordances.ttl` | `mem:RealignAction` provenance wrapper (3 activities: contract gap, structure gap, dangling role) |

Each corrected descriptor adds: `a wiki:QueryAffordance, prof:ResourceDescriptor`, `prof:hasRole wikirole:query-affordance`, `rdfs:label`, `rdfs:comment`, `dct:conformsTo <http://www.w3.org/TR/dx-prof/>`, `wiki:installedBy <…overlay#addressbook>`, a `wiki:querySource` (the `--default-graph-uri` the prose already names), and a structured `wiki:queryParameter` for the `$param`. Existing `sh:agentInstruction` + `wiki:selectQuery` preserved verbatim.

## Validation (inference="none", as the auditor uses)

- All 8 corrected descriptors **conform** to `wiki:AffordanceDescriptorShape`.
- `wiki:QueryAffordance` **conforms** to `wiki:ClassExtensionShape` (rooted subclass + label + comment).
- All 10 TTLs parse as valid Turtle.

## Repo-side fold-back (these are repo, not pod-only)

Deployed descriptors match `overlays/addressbook/affordances/*.ttl` byte-for-byte, so the fix is a **repo edit**, or `make reset` re-deploys the broken versions:

- corrected descriptors -> `overlays/addressbook/affordances/<same-name>.ttl`
- `wiki:QueryAffordance` class -> `overlays/wiki-memory/ontology/wiki.ttl`
- `wikirole:query-affordance` + `wikirole:search-affordance` roles -> `overlays/wiki-memory/ontology/wikirole.ttl`

## Auditor gaps found (feed back to pod_audit.py)

1. **`prof:hasRole` targets are not cross-checked against the wikirole scheme.** `wiki-search-grep.ttl` — the *reference* descriptor — cites `wikirole:search-affordance`, which is **absent from the deployed scheme** (verified: 0 occurrences). Auditor cross-checks cover `rdfs:seeAlso` + catalog pointers but not role references. Proposed adding the missing concept in `00-extension-query-affordance.ttl`; recommend a `resolve:hasRole` check.
2. The `descriptor:untyped` check fires correctly, but because entries lack `prof:ResourceDescriptor` they never reach the SHACL pass — so the *specific* missing predicates aren't enumerated by the audit. The per-predicate detail here came from reading each descriptor against the shape by hand.

## Escalation

None. No irreconcilable two-source conflict; the ontology + reference descriptor gave unambiguous ground truth. The one judgment call (new class + role) is flagged for human review, per the playbook's gated-extension requirement.
