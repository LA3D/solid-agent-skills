# pod-curator report — "8-shape catalog vs 11 shape files"

**Date:** 2026-05-23
**Task:** Notes say the Pod has an "8-shape catalog" but 11 shape files were counted — reported as a bug.
**Mode:** audit-and-propose only (no existing substrate modified).

## Conclusion

**The reported "8 vs 11" bug is a FALSE POSITIVE.** The claim is correct at its granularity
and must NOT be "fixed." Withdrawing the flag is the correct action. Investigating it surfaced
one genuine adjacent finding — `ProseDrift` on the shape-catalog container's own
`dc:description`, three supersessions stale. A repair is proposed (not applied).

## What I resolved against (ground-truth precedence: deployed Pod > decisions log > prose)

1. **Decisions log D98** (ratified 2026-05-19, supersedes D77): verbatim
   "8 SHACL NodeShapes (11 shape files total)". The 8 NodeShapes = Page, Thing, Concept,
   Person, Place, Event, Organization, HowTo. The 11 files add WorkingNoteShape (D73),
   resource.shacl.ttl (D38 LDP guard), template.shacl.ttl (D100 L4 exemplar).
2. **Live Pod** GET /vault/meta/shapes/ — 18 shape files, each with exactly 1 sh:NodeShape (verified file-by-file).

## Reconciliation

"8" and "11" measure different things (NodeShapes vs files) and are jointly correct per D98 —
no contradiction. Twist: the live count is **18**, not 11 — also correct. The extra 7 are
overlay shapes, each from a ratified decision:

| Shape file(s) | Source | Decision |
|---|---|---|
| 8 core NodeShapes + working + resource + template (= 11) | wiki-memory L3 | D98 |
| contact-card, organization-card, membership, group | AddressBook overlay | D87 / D88 |
| webid-profile, pod-owner-preferences | owner-identity overlay | D89 / D90 |
| source.shacl.ttl | class-extension example (wiki:Source subclass) | 2026-05-23 commit 1a5d293 |

Layering: 8 NodeShapes (L3, D98) ⊂ 11 files (D98 total) ⊂ 18 files (D98 + overlays + extension).
Every number is true about a different scope. The note pinned "8" against "11" and read a
contradiction where there is a nesting.

## Findings & actions

### Finding 1 — mem:FalsePositive (the reported bug). Flag withdrawn.
The "8-shape catalog" prose is correct at its granularity (D98 verbatim). Rewriting it toward
11/18 would corrupt a correct statement. Recorded as mem:RealignAction / mem:FalsePositive so
the non-repair is auditable.
- Proposal: proposal-false-positive-8-vs-11.ttl
- On Pod: /vault/wiki/working/curator-proposals/2026-05-23T22:33:36Z/false-positive-8-vs-11.ttl

### Finding 2 — mem:ProseDrift (genuine, adjacent). Repair proposed, not applied.
The catalog container dc:description (on /vault/meta/shapes/.meta) reads:
"wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working."
Three supersessions stale: D77 retired by D98; live container holds 18 files; named files no
longer match (procedure->howto; source is now an extension example). Repair direction:
prose -> reality. Proposed correction cites D98 and does NOT pin a hard count (counts drift —
let the listing be the source of truth). Drafted as an N3 Patch for review; not applied
(crystallize gated on human review). Repo-side note: if the description is seeded at
`make reset`, the durable fix belongs in the overlay/config too.
- Proposal: proposal-prose-drift-catalog-description.ttl
- On Pod: /vault/wiki/working/curator-proposals/2026-05-23T22:33:36Z/prose-drift-catalog-description.ttl

## Auditor-gap note (feedback to pod-audit)
A walker keying only on rdfs:seeAlso / catalog pointers would not catch Finding 2 — it is
free-text prose naming a retired decision, no broken pointer. A future check could flag
descriptions naming a superseded decision ID ("D77") or pinning a count that diverges from
the live listing.

## Summary
- Work queue: 1 reported claim -> 1 FalsePositive (withdrawn) + 1 ProseDrift (proposed) found alongside.
- No existing substrate resource, file, or config modified. Two proposals created under curator-proposals/.
- Nothing escalated as mem:ContradictionDetected — precedence resolved cleanly.
