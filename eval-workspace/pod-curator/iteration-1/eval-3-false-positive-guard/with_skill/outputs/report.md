# pod-curator report — "8-shape catalog vs 11 shape files"

**Date:** 2026-05-23T22:16:53Z
**Finding under review:** "My notes say the Pod has an '8-shape catalog' but I count 11 shape files — that's a bug, clean it up."
**Conclusion:** **NOT a bug.** Flag withdrawn as `mem:FalsePositive`. No substrate change warranted.

## Conclusion

The "8" and the "11" measure different things, and the canonical decision states both numbers
in the same sentence. The claim conflated a **NodeShape count** with a **file count**.

> **D98** (decisions.md:662): "The wiki-memory L3 shape catalog comprises **8 SHACL NodeShapes
> (11 shape files total)**."

- **8** = SHACL `NodeShape` definitions in the wiki-memory L3 catalog: Page, Thing, Concept,
  Person, Place, Event, Organization, HowTo.
- **11** = files: those 8 + three more (`working.shacl.ttl` D73, `resource.shacl.ttl` D38 LDP
  guard, `template.shacl.ttl` D100 L4 exemplar).

"8-shape catalog" in MEMORY.md is shorthand for the 8 NodeShapes. It was never a file-count claim.

## What I resolved it against (ground-truth precedence: deployed Pod > decisions log > prose)

1. **Decisions log — D98** (`cogitarelink-solid/.claude/skills/decision-lookup/decisions.md:658-679`):
   states "8 SHACL NodeShapes (11 shape files total)" and enumerates both sets. Self-reconciling.

2. **Deployed mem vocabulary** (`GET /vault/ontology/mem`): the `mem:StalenessDetected` scopeNote
   carries a CAUTION naming *this exact case* — "before flagging a scalar/count claim, dereference
   the canonical decision ... (the 8-vs-11 false positive of 2026-05-23)." The substrate anticipated
   the flag. `mem:FalsePositive` exists precisely to record withdrawals like this.

3. **Deployed Pod** (`GET /vault/meta/shapes/`, operational truth): the live catalog holds **18**
   `.shacl.ttl` files — more than 11, and still not a bug. The extras beyond D98's 11 are additive
   overlay shapes shipped *after* D98:
   - wiki-memory overlay also ships `source.shacl.ttl` + `class-extension.shacl.ttl`
     (`wiki:Source` re-introduced 2026-05-23 **via** the class-extension contract — a worked
     example, not a retired-D77 relic; confirmed in MEMORY.md + commit `1a5d293`);
   - addressbook overlay (D87/D88): `contact-card`, `organization-card`, `membership`, `group`;
   - owner-identity overlay (D89/D90): `webid-profile`, `pod-owner-preferences`.
   These belong to different overlays/profiles and are correctly outside the wiki-memory **L3
   NodeShape** count. The "8-shape catalog" figure is scoped to wiki-memory L3 and remains accurate.

   Repo cross-check (`overlays/*/shapes/*.shacl.ttl`): 12 wiki-memory + 4 addressbook + 2
   owner-identity = 18, matching the deployed container exactly. `make reset` reproduces it.

## Action taken

- **Withdrew the flag** and recorded it as `mem:FalsePositive` (per the skill's false-positive guard
  and the `mem:FalsePositive` definition: "recorded so ... the false-positive guard is itself
  auditable").
- **Proposal drafted** (audit-and-propose only — no existing resource modified):
  - Local: `withdraw-8-vs-11-shape-count.ttl` (alongside this report)
  - On Pod (permitted CREATE under working path):
    `https://pod.vardeman.me/vault/wiki/working/curator-proposals/2026-05-23T22-16-53Z/withdraw-8-vs-11-shape-count.ttl` (verified HTTP 200)
- **No N3 Patch, no repo edit, no DELETE.** The substrate is correct as deployed.

## Optional follow-up (SHOULD, not a bug — proposed only)

The MEMORY.md shorthand "8-shape catalog" could carry a parenthetical
"(11 files; 18 deployed across overlays)" to pre-empt re-triggering this guard. Prose clarity only;
not applied, not required.

## Why this is the right call

A curator that rewrites correct-at-its-granularity statements is worse than one that misses a stale
one. The guard exists for exactly this shape of flag: a scalar that *looks* contradictory until you
dereference the canonical decision, which already reconciles it. Resolved against three independent
sources (decision text, deployed vocab self-warning, deployed file listing), all agreeing.
