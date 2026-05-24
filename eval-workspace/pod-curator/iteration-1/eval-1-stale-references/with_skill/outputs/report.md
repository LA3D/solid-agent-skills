# Stale-reference triage report (with_skill)

> Note: this report.md was reconstructed from the subagent's final response — the
> harness blocked the subagent's own Write of a report file. The three proposal
> .ttl deliverables saved normally.

Task: find stale references left by a container rename (pages → concepts; sources merged into concepts) and draft repairs. Audit-and-propose only — no existing substrate resource, `.meta`, or server config modified.

**Work queue** (`pod_audit.py … --out-format json`): 11 WARN. Two are the rename (`resolve:seeAlso` at `wiki/pages/` and `wiki/sources/`). The other nine are pre-existing contract gaps unrelated to the rename (recommendations only).

**Ground truth** (precedence: deployed Pod > Type Index > prose): `GET wiki/` lists concepts/people/places/events/organizations/procedures/working — no pages/, no sources/. `wiki/pages/` and `wiki/sources/` both 404; `wiki/concepts/` is 200. Type Index routes **both** `skos:Concept` and `wiki:Source` to `wiki/concepts/`. Matches the D98 cleanup recorded in `wiki/.operations/`.

**Three stale references, all in the static storage-description config `css/config/void-description.json`** — not HTTP-PATCHable (PATCH → 405), so every fix is a repo edit reproduced by `make reset`:

| Stale ref | Class | Repair |
|---|---|---|
| `rdfs:seeAlso → wiki/pages/` (404) | `mem:DanglingReference` | repoint to `wiki/concepts/` |
| `rdfs:seeAlso → wiki/sources/` (404) | `mem:SupersededConcept` | remove — merged into concepts |
| `prof:hasResource → meta/profiles/source` (404) | `mem:DanglingReference` | remove — merged-away source kind |

Notes:
- The third (`prof:hasResource → meta/profiles/source`) was **not** caught by pod_audit (the walker checks `rdfs:seeAlso`/catalog pointers, not `prof:hasResource`) — found by walking the full storage description. Recommend extending the auditor's dangling check to `prof:hasResource`.
- **False-positive guard applied**: `prof:hasResource → meta/profiles/page` looked stale but resolves 200 and is the root PROF profile others inherit from — current, left untouched.

**Proposals drafted** (review-gated, D73 two-stage commit). Each is a `mem:RealignAction` per the playbook template carrying `as:object`, `prov:used` (ground truth), `prov:wasDerivedFrom`, `mem:stalenessClass`, and required `mem:rationale`, with the concrete before/after repo edit in a foot comment. Saved to outputs/ as `01-seealso-pages.ttl`, `02-seealso-sources.ttl`, `03-prof-hasresource-source-profile.ttl`. Nothing escalated as `mem:ContradictionDetected`.
