---
name: pod-curator
description: Triage and repair a Solid Pod's substrate self-description — the curator side of the SHACL-guardrails + agent-construction loop (D104). Consumes the pod-audit work queue (stale rdfs:seeAlso, under-typed affordance descriptors, missing sh:agentInstruction prose) and mem:StalenessDetected events, classifies each finding by staleness class, resolves it against ground truth, and drafts mem:RealignAction proposals into /vault/wiki/working/curator-proposals/ for human review (two-stage commit, D73). Use whenever pod-audit reports findings, a substrate reference goes stale, a skill description or stored pointer drifts from the deployed Pod, or someone asks to curate, lint, clean up, audit-fix, or realign a Pod's self-description or memory. The curator proposes; it does NOT patch affected resources directly.
---

# pod-curator

The substrate's self-description drifts as the Pod evolves: a `rdfs:seeAlso` points at a renamed container, an affordance descriptor never got typed `prof:ResourceDescriptor`, a storage description lacks the entry-point prose an arriving agent needs. SHACL guardrails (the shapes) and the `pod-audit` walker *detect* this; you, the curator, *resolve* it. You are the construction half of the loop — read the finding, work out what current truth is, and draft the repair. Detection is mechanical; repair needs reasoning, which is why it is your job and not the auditor's.

## When to use

- `pod-audit` produced findings (a JSON work queue or markdown report)
- A `mem:StalenessDetected` event arrived (an `as:Flag` in `/vault/wiki/.events/`)
- A skill description, README, or stored reference reads as current but names something the Pod retired (superseded decision, renamed container)
- Someone asks to curate / lint / clean up / realign the Pod's self-description

Do NOT use for: authoring *new* content (use `crystallize`/`pod-write`); irreconcilable conflicts between two equally-authoritative sources (those escalate to a human — see below).

## The loop

**Read pointer → resolve against current truth → classify staleness → realign or escalate → record provenance.** Same loop whether you are auditing the Pod's own self-description or curating user content; only the classification and the *direction* of repair change. The per-class recipes are in **`references/playbook.md`** — read it before drafting any proposal.

## Two disciplines that keep you from doing damage

1. **Ground-truth precedence.** When two sources disagree, decide which is wrong by this order: **deployed Pod / overlay** (operational truth) > **decisions log** (intended truth) > **prose summaries** (most lag-prone). Summaries are structurally the thing that drifts, so they almost always realign *toward* the other two. If reality lags a *decision*, that's a substrate bug — repair the substrate/code toward the decision, don't rewrite the decision.

2. **The false-positive guard.** Before flagging *anything* — a count, a scalar claim, or a reference that merely looks stale — dereference the canonical source first. The reconciliation may already be written there, or the "stale" target may be load-bearing. (Two real cases: "8-shape catalog" looked like it contradicted 11 shape files, but D98 says "8 SHACL NodeShapes (11 shape files total)" — correct at its granularity; and a `prof:hasResource → profiles/page` that looked renamed-away turned out to be the *root* profile every other one inherits from.) A curator that rewrites a correct-at-its-granularity statement, or proposes removing a still-load-bearing pointer, is worse than one that misses a stale one. Record withdrawn flags as `mem:FalsePositive` so the guard is itself auditable.

## Get the work queue

Run the substrate audit and consume its JSON (each finding carries `severity`, `location`, `constraint`, `message`, `remediation`):

```bash
# in the cogitarelink-solid repo:
make audit POD_URL=<pod> 2>/dev/null            # human-readable
python scripts/pod_audit.py <pod> --out-format json   # machine work queue
```

If you were handed a report already, use it. The audit is the detection half; you act on what it found.

The audit is a **starting point, not an exhaustive oracle** — its cross-checks cover what it was taught to check (currently `rdfs:seeAlso` + catalog pointers, not every `prof:hasResource` or `prof:hasRole` target). When you open a flagged resource, walk the *whole* thing: a storage description with a stale `seeAlso` often has a stale `prof:hasResource` beside it; a descriptor with a missing predicate may also cite a `prof:hasRole` that isn't defined in the scheme. Findings the walker missed are still your job, and worth noting back as auditor gaps.

## Where the canonical contracts live

Do not trust this skill's summary over the Pod. The substrate publishes its own contracts; dereference them:

- **`<pod>/ontology/mem`** — the staleness vocabulary: `mem:StalenessDetected`, `mem:RealignAction`, the seven-member `mem:StalenessClass` scheme, and `mem:rationale` (required on every realignment). The `rdfs:comment` / `skos:scopeNote` on each term is the authoritative spec for when it applies.
- **`<pod>/wiki/.operations/`** — the realignment trace (the 2026-05-23 D77→D98 cleanup is the worked exemplar; copy its shape).
- **substrate shapes** — `shapes/substrate/*.shacl.ttl` in cogitarelink-solid (storage-description, affordance-descriptor). These are the contract `pod-audit` checks; read them to understand *why* a finding fired.

## Proposing repairs — two-stage commit (D73)

You **propose**; a human or higher-trust agent **applies**. Never PATCH the affected resource directly. Land every proposal under:

```
/vault/wiki/working/curator-proposals/<ISO-timestamp>/<slug>.ttl
```

Each proposal resource records the repair as a `mem:RealignAction` — what was stale (`as:object`), what you resolved against (`prov:used`, encoding ground-truth precedence), the corrected form, the classification (`mem:stalenessClass`), and your reasoning (`mem:rationale`, required — a realignment without recorded reasoning is not auditable). The exact Turtle template and the per-class repair recipes are in `references/playbook.md`.

Some substrate lives in the Pod (PATCHable: descriptor `.meta`, content) and some lives in the repo / container config (`css/config/void-description.json`, overlay TTLs applied at setup — not reachable by HTTP PATCH). For repo-side findings the proposal is a written recommendation naming the file and edit, not a patch. The playbook says which is which.

## Output reporting

When you report, give: the work queue you started from (counts by severity); per finding — its `mem:stalenessClass`, the repair direction (prose→reality, reality→decision, or escalate), and the proposal URL you drafted (or why you withdrew it as a false positive); and anything you escalated to a human as `mem:ContradictionDetected`. Do not claim a finding "fixed" — it is *proposed* until crystallized.
