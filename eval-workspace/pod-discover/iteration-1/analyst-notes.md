# Sprint 1 — pod-discover Analyst Notes

**Iteration**: 1
**Pod state**: A1.3 (Rung 1.4 full wiki-memory L3 surface, with known substrate gaps: Type Index drift + empty `/meta/shapes/`)
**Runs**: 3 × with_skill + 3 × without_skill = 6 sub-agent invocations, all general-purpose.

## Quantitative result

| Metric | with_skill (n=3) | without_skill (n=3) | Delta |
|---|---|---|---|
| Pass rate (9 assertions) | 100% ± 0% | 100% ± 0% | **0** |
| Wall-clock | 131.4s ± 13.3s | 182.3s ± 3.7s | **-50.9s (-28%)** |
| Total tokens | 100,839 ± 627 | 106,161 ± 5,157 | -5,322 (-5%) |
| Tool calls | 9.3 ± 1.2 | 17.0 ± 7.0 | **-7.7 (-45%)** |

Pass-rate is non-discriminating — every assertion fired for every run. The discriminating signals are wall-clock and tool-call count: **the skill saves ~30% of wall-clock and ~45% of tool calls** to reach the same answer set.

## What the skill did

with_skill agents followed the prescribed 5-step chain almost exactly:
- HEAD `/vault/` → grep Link headers for storage description
- GET `/vault/.well-known/solid` (storage description)
- GET `/vault/meta/context.jsonld` (JSON-LD context)
- GET `/vault/meta/affordances/` + each of 4 descriptors
- GET each of 5 wiki container `.meta` files
- GET `/vault/settings/publicTypeIndex` (to confirm drift, as the skill warned)
- GET `/vault/meta/shapes/` (to confirm empty, as the skill warned)

No surprises. The skill's "Known substrate gaps" section directly prepped agents to look for + report the Type Index drift and empty shape catalog as known gaps, not blockers.

## What the skill cost

with_skill agents **did not find** several things without_skill agents discovered:
- **Parallel container hierarchies** — `/vault/resources/*` (PARA legacy) is still live, with its own `sh:agentInstruction` strings. Both organisations resolve. An agent has to choose which to write into.
- **The actual shape file** — `/vault/procedures/shapes/concept-note.ttl` exists. It's not advertised by the storage description, type index, or any `wiki:shape` predicate. The only real shape file on the Pod is the one nothing points at.
- **WebID profile** — `/vault/profile/card` declares `solid:oidcIssuer`, `pim:storage`, `solid:publicTypeIndex`. Not in the skill's prescribed chain.
- **Comunica is on a different port** — affordance descriptors reference `</sparql>` (relative to Pod origin) but CSS doesn't host SPARQL; the Comunica sidecar runs on port 8080. Following the affordance descriptor literally would 404.
- **Multiple top-level containers** — `areas/`, `archive/`, `ontology/`, `procedures/`, `profile/` — neither type registry covers them.

These are **real architectural findings the project needs to surface for Rung 1.5**, and the skill steered agents past them. The skill's "Key principle" (`don't guess paths`) is too narrow — it discourages legitimate exploration of `ldp:contains` listings the substrate itself returns.

## Variance observations

- **with_skill** runs are tightly clustered (duration stddev 13.3s on ~130s mean = 10%; tool calls 1.2 on 9.3 mean = 13%). The skill produces consistent behavior.
- **without_skill** runs are more variable in tool count (stddev 7.0 on 17.0 mean = 41%) — one run made only 9 tool calls, two made 20+. The bare-agent strategy diverges. Wall-clock is tighter (3.7s on 182s = 2%) because the longer-exploring runs were dominated by sub-agent overhead, not work.
- Token usage is remarkably similar across arms (100,839 vs 106,161, ~5% delta). Most token cost is in reading + reasoning over the substrate, not skill-loading overhead.

## Methodology learnings (the user's other Sprint 1 question)

What the skill-creator harness is good at:
- **Spawning parallel arms** is clean. 6 sub-agents in one turn, all returning structured outputs at known paths.
- **Programmatic assertions** scale well — 9 grepable checks across 12 output files, deterministic, runs in <1s.
- **Timing capture from completion notifications** works as advertised. Only-opportunity warning is real.
- **`aggregate_benchmark` produces useful summary** once `grading.json` has the expected `summary` and `execution_metrics` blocks.

What the skill-creator harness is *not* good at (or what I underweighted):
- **Pass-rate alone is a weak signal for skills that produce comparable answers via different paths.** Both arms got 9/9 — discrimination required looking at *secondary* metrics (wall-clock, tool calls, omissions). Future skill evals should explicitly assert path-efficiency and information-completeness, not just answer-correctness.
- **"Pre-skill drift" assertions are missing** — I had no assertion for "did the agent find the legacy /resources/ containers?" because the skill-creator template doesn't naturally surface "things the without-skill arm found that the with-skill arm missed." That's a real eval design gap.

## Recommendations for Sprint 1 iteration-2 (if iterating)

1. **Loosen "don't guess paths"** in the skill. Replace with "follow Link headers, `rdfs:seeAlso`, and `ldp:contains` from previously-fetched resources — but `ldp:contains` is legitimate discovery, not guessing." This recovers the breadth without sacrificing efficiency.
2. **Add a step that catalogs top-level containers** — `GET /vault/` returns `ldp:contains`; agents should list those, not skip them. The skill's discovery chain goes "Pod root → storage description" and never returns to the root listing.
3. **Document the live drift surfaces** — `/vault/resources/*` and `/vault/procedures/shapes/` are real substrate residue. The skill should call them out so agents know they exist and might want to query them.
4. **Tighten the assertions** for iteration-2: add an assertion that fires when the agent reports `/vault/resources/concepts/` (legacy container) or `/vault/procedures/shapes/concept-note.ttl` (the real shape file). Currently with_skill arm scores 9/9 but misses these — the assertions don't catch it.

## Recommendations for Rung 1.5 substrate work

These findings inform substrate (cogitarelink-solid) work, not just skill iteration:

1. **Type Index update** — the Phase 2 PARA registrations should be either replaced with wiki:* class registrations (D78), or `/settings/publicTypeIndex` should be removed entirely if the storage description's `rdfs:seeAlso` is the canonical class→container surface.
2. **Shape files** — populate `/vault/meta/shapes/` with the 5 SHACL files cited by container `.meta`. The repo has them at `shapes/wiki-memory-l3/` already; they just need to be served at the URLs the substrate is currently advertising as broken pointers.
3. **Comunica port reconciliation** — affordance descriptors say `wiki:invokedAt </sparql>`; CSS resolves that to `http://pod.vardeman.me:3000/sparql` which doesn't exist. Either change the descriptor to point at port 8080 explicitly, or proxy SPARQL through CSS, or document the dual-port reality in the affordance descriptor.
4. **Legacy `/vault/resources/*` containers** — decide whether they're transitional (delete) or part of the L3 surface (document + cross-reference from storage description). Two parallel typed-resource hierarchies with no cross-reference is the kind of ambiguity that will compound across the eval matrix.

## Bottom line

**Sprint 1 result**: the new pod-discover skill (Rung 1.4-aware) reliably guides sub-agents through the substrate self-description chain ~30% faster than bare-agent discovery, at the cost of narrower exploration. All 9 success assertions pass for both arms — the skill is *correct*, but assertions don't fully capture the trade-off.

**Sprint 1 methodology result**: the skill-creator harness pattern works for Pod evals. Workspace structure, eval_metadata.json schema, timing capture, programmatic grading, aggregation — all functional. The assertions need to be richer for future sprints.

**Sprint 1 substrate result**: the eval surfaced 4 substrate findings the project should act on (Type Index, shape files, Comunica port, legacy containers). These are byproducts of the eval, not its primary purpose, but they're valuable.
