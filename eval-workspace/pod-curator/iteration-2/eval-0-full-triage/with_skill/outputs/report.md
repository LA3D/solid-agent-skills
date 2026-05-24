# pod-curator triage report — 2026-05-23

**Pod:** https://pod.vardeman.me/vault/
**Mode:** audit-and-propose only (no substrate or config modified; proposals drafted for review).
**Audit command:** `python scripts/pod_audit.py https://pod.vardeman.me/vault/ --out-format json`

## Work queue (from pod_audit)

| Severity | Count | Constraint |
|---|---|---|
| WARN | 2 | `resolve:seeAlso` (storage-description pointers 404) |
| WARN | 9 | `descriptor:untyped` (catalog entries not `prof:ResourceDescriptor`) |
| **Total** | **11** | (0 ERROR, 11 WARN) |

Clustered into **3 coherent repairs** + **2 auditor-gap findings** the walker missed but I caught while
walking the flagged resources whole.

## Per-finding triage

### Cluster A — storage-description `seeAlso` → retired containers (2 findings)
- **Findings:** `resolve:seeAlso` @ `wiki/pages/` and @ `wiki/sources/` (both 404).
- **`mem:stalenessClass`:** `mem:DanglingReference`.
- **Resolved against:** the live container set (probed: `concepts/` + 6 others = 200; `pages/`/`sources/` = 404)
  and the **Type Index** (operational ground truth) — `skos:Concept` AND `wiki:Source` both route to
  `wiki/concepts/`. This is the D77→D98 rename (pages+sources folded into concepts).
- **Repair direction:** reality (stale static config) → decision (D98). **Repo-side**, not PATCHable.
- **Root cause:** the storage description is the union of static `css/config/void-description.json` (still
  emits the retired pair) and `overlays/wiki-memory/storage-patch.ttl` (already emits the correct D98 set).
  Fix = delete the two stale `StaticStorageDescriber` blocks from the JSON; the overlay supplies the rest.
- **Proposal:** `01-seealso-dangling-pages-sources.ttl`

### Cluster B — 9 untyped affordance descriptors (9 findings)
- **Findings:** `descriptor:untyped` @ `contact-find-by-{name,email,orcid,affiliation,group}`,
  `org-find-by-{ror,name}`, `bridge-card-to-wiki`. Each types only `wiki:Affordance`, so it escapes
  `AffordanceDescriptorShape` (no role/label/conformsTo/installedBy enforced).
- **`mem:stalenessClass`:** `mem:ProseDrift` (closest fit; honestly a **contract/construction gap**, not
  staleness — `mem:StalenessClass` has no `ContractGap` member, noted as a vocab gap below).
- **Resolved against:** `shapes/substrate/affordance-descriptor.shacl.ttl` (the contract the audit checks)
  + the typed siblings (`hub-view`, `breadcrumb-view`, `memento`) for the predicate pattern.
- **Repair direction:** add the four missing contract predicates + the correct type/role.
- **Key judgment call (flagged for human review):** all nine are **client-run parameterized SPARQL-SELECT
  lookups** (`wiki:selectQuery` + a `$param`, run in the agent's own Comunica — the Pod has no endpoint).
  **No existing type or role fits:** `wiki:SearchAffordance` is for HTTP `?ext=` dispatch and its SHACL
  *requires* `wiki:dispatchPattern`/`wiki:targetContainer` (typing these so would *fail* validation —
  false-positive guard applied); `DerivedNavigation`/`DerivedClass` derive views/classes, not by-key
  retrievals; the wikirole scheme has no query/lookup role. Per the class-extension contract (D100,
  `wiki:ClassExtensionShape`) the fix is a **gated extension**, not a forced misfit.
- **Proposals (two-stage, 02 is prerequisite for 03):**
  - `02-extend-query-affordance-class-and-role.ttl` — new `wiki:QueryAffordance` (subClassOf
    `wiki:Affordance`) + `wikirole:query-affordance` role. Satisfies `ClassExtensionShape` (validate
    `inference="none"`).
  - `03-retype-9-untyped-query-affordances.ttl` — types all 9 `prof:ResourceDescriptor`,
    `wiki:QueryAffordance`; adds `prof:hasRole wikirole:query-affordance`, `rdfs:label` (composed per
    descriptor), `dct:conformsTo <PROF>`, `wiki:installedBy <overlay#addressbook>`. Repo-side fold-back
    into `overlays/addressbook/affordances/`; optional non-durable pod-side PATCH preview included.

### Auditor-gap findings (NOT in the queue — walker missed; caught while walking storage description whole)
- **`prof:hasResource → meta/profiles/source` = 404** and **`meta/profiles/procedure` = 404.** Same
  `mem:DanglingReference` class as Cluster A (source→concept, procedure→howto under D98), in the same
  static config. `pod_audit` cross-checks `rdfs:seeAlso` but not `prof:hasResource`. Recommendation +
  an auditor fix recorded inside proposal `01`. Not auto-proposed as separate `RealignAction`s because
  re-point-vs-drop needs the profile-inheritance chain confirmed — reviewer judgment.
- **False positive recorded (guard worked):** `prof:hasResource → meta/profiles/page` = 200 — the
  load-bearing **root** profile every other profile inherits from. Looked rename-adjacent; left untouched.

## Nothing escalated as `mem:ContradictionDetected`
No two equally-authoritative sources disagreed. Every finding had a clear ground-truth winner
(deployed Pod / Type Index / substrate shape over stale static config).

## Proposal index

| File | Findings covered | Class | Direction | Status |
|---|---|---|---|---|
| `01-seealso-dangling-pages-sources.ttl` | 2 x `resolve:seeAlso` (+2 auditor-gap `prof:hasResource`) | `mem:DanglingReference` | reality->decision (repo) | proposed |
| `02-extend-query-affordance-class-and-role.ttl` | prerequisite for the 9 (type/role gap) | construction (gated extension) | grow conceptual structure | proposed |
| `03-retype-9-untyped-query-affordances.ttl` | 9 x `descriptor:untyped` | `mem:ProseDrift` / contract gap | add governance predicates (repo) | proposed |

All three TTLs parse clean as Turtle (rdflib). Nothing crystallized — every item is **proposed**, gated
on human / higher-trust review per two-stage commit (D73).

## Notes back to the substrate maintainers
1. **Vocab gap:** `mem:StalenessClass` has no `ContractGap`/`ContractDrift` member. The 9 descriptor
   findings are construction gaps, not staleness; I used `mem:ProseDrift` as the nearest fit. Consider
   adding a contract-gap class so these don't have to borrow a staleness label.
2. **Auditor gap:** extend `pod_audit.py` to dereference `prof:hasResource` targets (would have caught the
   two 404 profiles). Likely also `prof:hasRole` targets against the wikirole scheme.
