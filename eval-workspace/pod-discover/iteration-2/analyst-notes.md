# Sprint 1 — pod-discover Analyst Notes (Iteration 2, post-substrate-cleanup)

**Iteration**: 2
**Pod state**: A1.3-post-cleanup (substrate-cleanup-complete tag, all 16 substrate tests green at start)
**Runs**: 3 × with_skill + 3 × without_skill = 6 sub-agent invocations, all general-purpose

## Headline

The substrate cleanup achieved its primary goal: **the skill's wall-clock and tool-call advantage shrank to noise**. The skill still helps measurably on pass rate (94.4% vs 86.1%), but it no longer reduces navigation cost — because there is meaningfully less substrate to navigate around. The 501-on-`.well-known/solid` bug is now the dominant residue: all 6 agents hit it, all 6 recovered by reading `<root>/.meta` via the `describedby` Link, but the recovery cost ~3-4 extra requests per run.

## Quantitative comparison

| Metric | iter-1 with | iter-1 without | iter-1 Δ | iter-2 with | iter-2 without | iter-2 Δ | shift |
|---|---|---|---|---|---|---|---|
| Pass rate | 100% ± 0% | 100% ± 0% | 0.00 | 94.4% ± 10% | 86.1% ± 10% | **+0.08** | **discriminating now** |
| Wall-clock | 131.4s ± 13.3s | 182.3s ± 3.7s | **-50.9s** | 165.4s ± 6.5s | 165.5s ± 14.7s | **-0.1s** | **delta collapsed** |
| Tool calls | 9.3 ± 1.2 | 17.0 ± 7.0 | **-7.7** | 15.3 ± 3.1 | 16.0 ± 1.0 | **-0.7** | **delta collapsed** |
| Tokens | 100,839 ± 627 | 106,161 ± 5,157 | -5,322 | 108,297 ± 926 | 111,804 ± 5,721 | -3,507 | similar |

Three things changed:

1. **The skill no longer saves time.** Iter-1's 28% wall-clock advantage was the skill telling agents which 9 URLs to fetch instead of 17. Iter-2: with-skill agents made **15 requests** because the skill's "fetch the storage description first" advice now fails (501) and the agents have to follow the same fallback the without-skill arm finds organically. The skill's prescribed first hop is broken.

2. **Pass rate became discriminating.** Iter-1 every assertion fired for every run (the test was a floor, not a ceiling). Iter-2 with the cleanup-specific assertions added (capability catalog, class IRI dereference, no Phase 2 residue), the floor moved up and the skill arm started winning on the new criteria. Most of the iter-2 failures are stale-grader false negatives (see "Grader staleness" below), not real performance gaps.

3. **Tokens unchanged.** Most of the cost was in reasoning about the substrate, not in routing-around its bugs. As predicted by iter-1.

## What the cleanup successfully eliminated

- **PARA legacy.** Every agent's output: zero references to `/resources/concepts/`, `/resources/literature/`, `/procedures/shapes/`. `test_no_phase_2_residue_reported` passed 6/6.
- **Type Index drift.** Agents found `/vault/settings/publicTypeIndex` with 5 `wiki:*` TypeRegistration entries, not the iter-1 PARA leftovers. The skill's "Known substrate gap #1 — Type Index drift" warning is now wrong; agents who read the skill see it and discover it's stale.
- **Empty shape catalog.** `/vault/meta/shapes/` now serves 5 `.shacl.ttl` files. The skill's "Known substrate gap #2" warning is also stale.
- **Comunica orphan port.** No agent reported a 404 SPARQL endpoint or port-8080 mismatch. Affordance descriptors now correctly declare client-side SPARQL execution (the `cap:DerivedView` model), and agents understand the contract.
- **Capability catalog visible.** All 6 agents reached `/vault/meta/capabilities/` and reported the three primitives (`cap:DerivedView`, `cap:ContentProjection`, `cap:TimeTravel`). The D83 architecture-as-data is empirically discoverable.

## What the cleanup didn't fix (the new universal pain point)

**`.well-known/solid` returns 501 Not Implemented.** This is RQ-Substrate-1, deferred from Phase 3 (commit cd8aa3a documents it). Every agent — both arms — encountered it. The recovery path is uniform: the Pod root carries a `describedby` Link pointing at `<root>/.meta`, which carries the actual storage-description triples (`pim:Storage`, `void:vocabulary`, `cap:catalog`, etc.). So the substrate is *correct* in the data layer; only the spec-mandated `Link rel=solid:storageDescription` endpoint is broken.

**Cost impact**: ~3-4 extra requests per agent (HEAD root → try .well-known/solid → 501 → read root's `.meta` → continue). At ~165s mean wall-clock, this is ~20% of the total time. Fixing this 501 should drop both arms to ~130s and re-create some of the iter-1 wall-clock delta — but **only if the skill's guidance is also updated** to mention the `.meta`-on-root location.

## What surprised (new findings)

1. **No `rdfs:seeAlso` on root `.meta`.** The skill claims the storage description publishes 5 `rdfs:seeAlso` entries pointing at the wiki containers. Several agents reported not finding these (run-2, run-3 with_skill; run-3 without_skill). They reached the wiki containers via Type Index `solid:forClass` instead. Whether `rdfs:seeAlso` is actually emitted (in storage-patch.ttl) but not surviving the PATCH-merge into the served `.meta`, or whether the skill description was wrong, needs a quick check — `curl -sS -H "Accept: text/turtle" http://pod.vardeman.me:3000/vault/.meta | grep seeAlso`.

2. **`void:vocabulary` under-declares.** Multiple agents flagged that `void:vocabulary` lists ~5 entries (SKOS, DCT, PROV, capability/overlay namespaces) but the Pod uses ~15 (adding CITO, FOAF, SHACL, `wiki:`, etc.). The D49 "every vocab dereferenceable" promise is structurally met (Path Z hosting works) but the catalog is incomplete. This is a real bug to file — should be added to the overlay's `storage-patch.ttl`.

3. **Affordance / capability split confused the skill arm.** The skill text predates the D83 two-tier model (capabilities under `/meta/capabilities/` + affordances under `/meta/affordances/`, linked by `wiki:requiresCapability`). Several with-skill agents noted "the skill conflates the two." Skill iteration-3 should adopt the D83 framing.

4. **Pod data tier is empty.** Agents discovered the type system, the shapes, the affordances, the vocabularies — but the 5 wiki containers themselves are empty (no instances yet). This isn't a bug, it's expected; but it means iter-3 won't be able to test query-time discovery (cross-container links, hub derivation, etc.) without a content seed.

## Grader staleness (3 stale patterns to fix for iter-3)

1. **`fetched_root_or_any_url`**: regex `(GET|HEAD)\s+http://pod\.vardeman\.me:3000/vault/[^\s|]*` failed on with_skill/run-1 and without_skill/run-2 despite both runs clearly fetching `/vault/`. The transcript formats are inconsistent (`HEAD http://...` vs `1. \`HEAD http://...\`` with backticks). Tighten the regex or accept either form.

2. **`named_all_5_wiki_classes`**: regex looks for literal `wiki:Source` etc. After the namespace fix made class IRIs `http://pod.vardeman.me:3000/vault/ontology/wiki#Source`, several agents wrote responses using the full IRI or the JSON-LD short form (`Source`, `Concept`) and the prefixed-name regex missed them. Should accept either short-form, prefixed, or full-IRI naming.

3. **`noticed_substrate_gap`**: regex hardcodes the iter-1 gaps (Type Index drift, empty shape catalog). Now both are closed, so agents who notice the NEW gap (the 501) get marked as failing this check. Update the regex to recognize "501", "NotImplementedHttpError", or "Not Implemented" as a valid substrate gap signal.

After fixing these three, iter-2 pass rates should be 12/12 for nearly every run, and the skill delta will collapse further — confirming the cleanup story even more cleanly.

## Implications for Rung 1.5

The substrate cleanup achieved what it was supposed to achieve: **the skill becomes accelerant, not corrective**. Three implications:

1. **Sprint 2 (pod-read) can proceed.** The substrate is now structurally honest enough that a follow-up skill can focus on dual-layer linking (body + `.meta`) rather than working around residue.

2. **The pod-discover skill needs an iter-3 refresh.** Drop the stale "Known substrate gaps" section; replace with a single "Known issue: `.well-known/solid` returns 501; recover via root's `describedby` Link". Add the D83 capability/affordance split. The skill is currently misleading agents about substrate state that the cleanup just fixed.

3. **Fix the deferred 501 bug.** RQ-Substrate-1 is the highest-leverage substrate work remaining — fixing it would recover the iter-1 wall-clock advantage AND clean up the universal pain point. Estimated effort: investigate CSS routing for `.well-known/` resources under WaterfallHandler; likely a single-file CSS-config change. Should land before Rung 1.5's A1.1/A1.2/A1.3 arm comparison so the comparison isn't dominated by this one bug.

## Methodology learnings (iter-2 retrospective)

- **The iter-1 grading file structure carried forward cleanly.** Adding 3 new checks in a separate `grade_iter2.py` (imports the iter-1 check fns) preserves the iter-1 grading.json files untouched while extending coverage.
- **3 of 12 assertions are "iteration-1-style" (validate that pre-cleanup gaps still exist).** These are now structurally stale; remove or invert for iter-3.
- **The combined-source check pattern (`(transcript, response) -> tuple`) is the right shape** for assertions that need both — better than running two checks and AND-ing the results.

## Bottom line

**Substrate cleanup result**: Wall-clock skill delta collapsed from -50.9s to -0.1s. PARA residue, Type Index drift, empty shape catalog, Comunica orphan service — all gone. Capability catalog (D83) is empirically discoverable. **The cleanup did its job.**

**Substrate residue remaining**: `.well-known/solid` 501 is the new top pain point. Universal across both arms. The Pod's data layer is correct (root `.meta` has everything); only the spec-mandated endpoint is broken. Fixing this is the next highest-leverage piece of substrate work.

**Skill result**: Still helps (94% vs 86% pass rate) but no longer reduces navigation cost. Needs an iter-3 refresh to drop the stale gap claims and adopt the D83 capability/affordance framing.

**Sprint 2 gate**: Pass. Proceed to pod-read.
