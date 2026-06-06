# Pod Skill Acquisition — From Cold Baseline to Learned Curriculum

> **Status:** open research agenda (pre-design). Not a spec, not a plan. The point is to frame the
> questions, record the evidence we already have, and collect concrete leads — *before* committing to
> a build. **Explicit non-goal: over-building.** If this agenda has a spine, it is "let measurement set
> the floor, not taste."
>
> **Date:** 2026-06-03 · **Repo:** solid-agent-skills · **Companion threads:** cogitarelink-solid
> `FOLLOWUPS.md` (cold-probe findings, two-tier access framing, substrate gaps) and the D109 coherence
> model (Tier-0 legibility / Tier-1 SHACL floor / Tier-2 curation).

## 1. Why this agenda exists

We suspect the current skills are **over-built**: hand-written, highly detailed procedural docs that
duplicate what a memory pod *already says about itself* over standard HTTP. Two pieces of evidence,
both from this repo's own history, motivate the suspicion.

**Evidence A — the drift treadmill (2026-06-03 `pod-discover` resync).** `pod-discover/SKILL.md` had
drifted hard against the live pod (port `:3000`, `urn:example:wiki#`, `wiki:typeIndex`, a 5-container
layout, a "substrate gaps" section dated 2026-05-15). Re-grounding it took **+191 lines** that
re-encode the pod's container names, predicate IRIs, affordance filenames, and shape names — *every one
of which the pod serves live and authoritatively*. A static copy of a moving target rots; "fixing" it
only resets the clock. This violates our own decisions: **D103** ("skills are minimal bootstrappers
pointing at the on-Pod descriptor; they don't duplicate substrate content") and **D55** (Tier-1
brute-force HTTP is always functional).

**Evidence B — the cold probe (n=3, 2026-06-02).** Three agents with *only* an HTTP GET tool — no repo,
no skills, no hints — read the live pod and correctly reconstructed its structure (discovery chain,
dual-layer markdown+`.meta`, two-subject model, two-stage commit, SHACL-422). A bare agent reaches the
**basic principles and patterns** from the pod's own in-band self-description. (Where they *failed* —
the inline authoring grammar — the right fix turned out to be the in-band teaching, not a thicker
skill. Same lesson, twice.)

So the working suspicion: the durable, useful part of a "skill" is a small set of **navigation
principles**; the rest is a snapshot of pod state that belongs *on the pod*.

## 2. The argument that forces the issue: pods are dynamic and heterogeneous

A detailed skill assumes a fixed pod. But **my memory pod and Chris's memory pod will not match** —
different content, different overlays, different L3 conventions, evolving over time. A skill that
memorizes *this* pod's containers and predicates cannot generalize to *that* pod, and goes stale on
*either* when it changes.

What *does* generalize is a **foundational set of principles** the agent uses to navigate *any* pod:

- the pod is self-describing — follow the `solid:storageDescription` Link from any URL;
- path segments are **opaque** — meaning lives in the `.meta`/representation (RDF), not in the words
  of the URL (the URI-opacity point);
- the discovery chain is `GET → describedby → catalogs/Type-Index/shapes`;
- writes are governed by SHACL; correct against the `422 sh:ValidationReport`.

This is also exactly the multi-pod federation question from Rung 1.5 (L2-shared / L3-differing): the
shared substrate (L1/L2) is what the foundational principles can rely on; the per-pod profile (L3) is
what must be *discovered, not memorized*. **The thin/principled skill is the only thing that survives
heterogeneity.** That, not elegance, is the core reason to resist over-building.

## 3. Method: cold agents as the measurement instrument

There is a context asymmetry we can exploit. The *working* agent (me, in a session) has the code, the
tests, the decision log, and project memory — so it can never honestly tell us what a pod teaches on
its own. A **cold agent** (fresh, HTTP-only, no skills) has nothing but what the pod hands it. So a
cold agent's behavior — what it discovers, what it gets wrong, where it stalls — is the *honest
measure* of what the pod and its skills actually convey.

The method, then: **tune against what cold agents reveal, not against what we assume.** Every change to
in-band information or to a skill is validated by re-probing cold.

## 4. The two knobs (in order)

**Knob 1 — the information the pod returns (in-band self-description).** Tune this *first*. It is the
Tier-0 legibility surface and it serves every agent (skilled or not) and every pod equally. Open
question: what is the *minimal* in-band description from which a competent cold agent can read AND write
consistently? (The cold probe says the read side is nearly there; the authoring grammar is the known
hole — see cogitarelink-solid FOLLOWUPS.)

**Knob 2 — baseline procedural instructions.** A small amount of procedural knowledge an agent cannot
infer from the pod alone, specifically:

- **Driving the SPARQL/Comunica traversal tool.** The graph view is *not* a standard SPARQL endpoint —
  querying a pod uses Comunica-specific algorithms (link-traversal + explicit-`.meta` sources, the
  RQ-Pod-4 pattern). A cold agent cannot infer this; it needs baseline instructions on *how to query*.
- **The graph-view-vs-document-view routing policy.** When does an agent GET a document (read the
  markdown body / `.meta`) versus *query the graph* to retrieve a memory? This mixture is the heart of
  "retrieve consistently," and it is procedural, not declarative — a prime candidate for a learned
  skill rather than a hand-written rule.

## 5. The arc: cold baseline → curriculum → curation

1. **Cold baseline.** Measure how cold agents read/write/retrieve, against tasks, with minimal or no
   skill. This is the floor and the training signal. (`eval-workspace/pod-discover/` is the seed.)
2. **Curriculum.** From the baseline, develop the procedural knowledge that lets an agent read and write
   the pods **consistently** (consistency = the round-trip property: what you write, you can retrieve).
3. **Curation.** By the *same* method, build specialized **data-quality agents** (the Tier-2 lint /
   pod-curator loop, Karpathy's "Lint"). The recursion is the elegant part: one method produces both
   the read/write procedural memory *and* the curation agents.

## 6. Prior art and how we'd research it

**GEPA — skills as *learned* artifacts (the most direct lead).** GEPA (Genetic-Pareto reflective prompt
evolution; Agrawal et al., ICLR 2026 Oral) optimizes a text artifact by reflective mutation against an
eval that returns **rich textual feedback** (not just a scalar), with Pareto-frontier candidate
selection — reported ~35× more sample-efficient than RL. Crucially for us, **`gskill`** (open source
inside `gepa-ai/gepa`, at `src/gepa/gskill/`) is *literally this use case already built*: it evolves
`SKILL.md` files with **Claude Code (`claude --print`) as the executor**, scored against verifiable
SWE-smith tasks — **no DSPy in the execution loop**. The optimizer/executor seam is
`optimize_anything(seed_candidate=<SKILL.md text>, evaluator=...)`, where *our* `evaluator` shells out
to the harness and returns `(score, side_info)`; the `side_info` carries the diagnostic text (test
output, transcript) the reflection LM learns from.

**Constraint this respects (and the DSPy tension).** We like DSPy, but DSPy-as-the-agent-harness is the
thing to avoid here — we want Claude Code to stay the executor. `dspy.GEPA` makes DSPy the executor; the
**standalone `gepa` library** does not (DSPy is merely one of several adapters). So the methodology is
reusable *without* porting our agent into DSPy. `gskill` is the existence proof.

**Honesty / no-stubs survives optimization — but only if the eval is execution-grounded.** GEPA writes
whatever scores well, so a fabricated path or a stub instruction can survive if it doesn't *hurt* the
score. The defense (and it aligns precisely with our `no-stubs-real-or-error` principle): make the eval
**execution-grounded** so a hallucinated path *fails a real test*; add validators in the evaluator that
penalize nonexistent paths/unrunnable commands with corrective feedback; state the honesty constraint in
the reflection prompt; and inspect the winning artifact on a held-out set before adopting it.

**Claude-Code-as-executor, practically.** `claude -p` (headless) with `--output-format stream-json
--verbose` gives a parseable trace (tool calls, errors) for scoring. Note: user-invoked skills (`/name`)
are *not* available in `-p` — eval prompts must be **task-phrased** so the skill auto-triggers from its
`description:`. First-party `skill-creator` (anthropics/skills) automates only the `description:`
(triggering) loop; the skill *body* improve-loop is human-in-the-loop — which is exactly the gap a GEPA
body-optimization loop fills. Dynamic Workflows and Hooks are execution-time only.

**The interactive-harness contrast (`predict-rlm`).** The "LLM-predict" reference is most likely
`predict-rlm` (Trampoline-AI) — a *self-harnessed* RLM where the LLM holds its own control flow, built
on DSPy. It marks the opposite end of the spectrum from Claude Code's Dynamic Workflows (human writes
the loop, model fills the slots). Relevant as orientation — and tied to our own `rlm` repo — but its
DSPy basis is the very thing our "keep Claude Code as the harness" constraint rules out for skill
optimization. Worth watching, not adopting, for this purpose.

**Cognitive-architecture framing.** All of this is CoALA *procedural memory learned from trajectories*
(ReasoningBank lineage) — squarely in the project's research frame, not a detour.

## 7. Open research questions

- **RQ-Skill-Minimal:** what is the smallest durable skill (the navigation principles) that lets a
  competent cold agent operate *any* conformant pod? Is "thin bootstrap + self-describing pod" enough,
  or is a procedural floor (Knob 2) irreducible?
- **RQ-InBand-Minimal:** what is the minimal in-band self-description for consistent cold read *and*
  write? Should it be **derived** from substrate behavior (shapes/Type-Index/projector config) so it
  cannot drift — fixing both skill-drift and in-band-drift at the source?
- **RQ-SPARQL-Baseline:** what baseline instruction does an agent need to drive the Comunica traversal
  tool, given there is no standard endpoint?
- **RQ-View-Routing:** what is the graph-view-vs-document-view retrieval policy, and is it better
  hand-written or *learned*?
- **RQ-Learned-Honesty:** how do we keep a *learned* skill honest (no hallucinated paths, no stubs)
  under an optimizer that rewards only score? (Execution-grounded eval is the leading answer.)
- **RQ-Curriculum-Transfer:** does a curriculum learned on one pod transfer to a heterogeneous pod
  (mine vs Chris's), or does it overfit to L3 specifics? (The heterogeneity test is the real validation
  of "foundational principles.")
- **RQ-Signal:** can the Tier-1 eval (answer-from-memory + round-trip consistency) double as the GEPA
  training signal — measurement and learning from one harness?

## 8. Resources (verified leads)

GEPA / learned skills:
- `gepa-ai/gepa` — https://github.com/gepa-ai/gepa · paper (ICLR 2026 Oral) https://arxiv.org/abs/2507.19457
- `optimize_anything` API — https://gepa-ai.github.io/gepa/api/optimize_anything/optimize_anything/ · intro https://gepa-ai.github.io/gepa/blog/2026/02/18/introducing-optimize-anything/
- **gskill** (SKILL.md optimization for coding agents) — guide https://gepa-ai.github.io/gepa/guides/gskill/ · code https://github.com/gepa-ai/gepa/tree/main/src/gepa/gskill · blog https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/
- DSPy GEPA (the path we *avoid* for execution) — https://dspy.ai/api/optimizers/GEPA/overview/
- SWE-smith / mini-SWE-agent (verifiable task signal) — https://github.com/SWE-agent/mini-swe-agent

Claude Code as executor:
- Headless (`claude -p`) — https://code.claude.com/docs/en/headless
- Dynamic Workflows (execution-time only) — https://code.claude.com/docs/en/workflows
- skill-creator (eval/triggering loop; body improve is human-in-loop) — https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md · https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills
- Third-party precedent (study, don't depend): `rartzi/ClaudeSkills-Optimizer-GEFA` — https://github.com/rartzi/ClaudeSkills-Optimizer-GEFA
- Sandboxed skill-activation eval (worked example) — https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals

Eval design / anti-reward-hacking:
- RewardHackingAgents — https://arxiv.org/html/2603.11337 · LLM-as-judge best practices — https://agenta.ai/blog/llm-as-a-judge-guide-to-llm-evaluation-best-practices

Interactive-harness contrast:
- `predict-rlm` (likely "LLM-predict") — https://github.com/Trampoline-AI/predict-rlm · DSPy — https://github.com/stanfordnlp/dspy

## 9. Where this connects (cross-repo)

- cogitarelink-solid `FOLLOWUPS.md`: the cold-probe findings (in-band grammar teaching, URI opacity,
  bridge affordances), the two-tier access framing (CLI+skills now / MCP later), and the two substrate
  gaps surfaced during the `pod-discover` resync (missing container `agentInstruction`s;
  `markdown-projection` `sub:governs` missing the literal axis).
- D109 coherence model: Knob 1 ≈ Tier-0 legibility; the curriculum ≈ procedural memory; curation ≈
  Tier-2 lint. The eval ≈ the training signal that ties them together.
- D103/D55: this agenda is, in part, "return to our own stated principle (thin bootstraps over the
  self-describing pod) — and make it empirical."
