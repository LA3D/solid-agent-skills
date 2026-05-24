# Audit: "8-shape catalog" vs "11 shape files" — is this a bug?

**Date**: 2026-05-23
**Mode**: audit-and-propose (read-only against existing substrate)
**Pod**: https://pod.vardeman.me/vault/meta/shapes/

## Conclusion

**The "8 vs 11" framing is NOT a bug — it is a false positive.** "8 shapes" and "11 files"
are not contradictory; they count two different things, and the canonical decision record
states both numbers together.

D98 (ratified 2026-05-19, *supersedes D77*) defines the wiki-memory L3 catalog as:

> "8 SHACL **NodeShapes** (11 shape **files** total)"

- **8 NodeShapes** = governed content shapes: Page, Thing, Concept, Person, Place, Event,
  Organization, HowTo.
- **11 files** = those 8 + three companion files: `working.shacl.ttl` (WorkingNote, D73),
  `resource.shacl.ttl` (D38 LDP guard), `template.shacl.ttl` (L4 exemplar, D100).

A note saying "8-shape catalog" and a file count of "11" are *both correct as of D98*. Nothing
to clean up at that level — doing so would itself be the error (the false-positive guard).

## Resolved against

1. `decision-lookup/decisions.md` §D98 (line 658): "8 SHACL NodeShapes (11 shape files total)";
   D98 explicitly supersedes the older D77 five-shape catalog.
2. Project MEMORY.md: "8-shape catalog (D98, supersedes D77/D78)".
3. Live Pod: `GET /vault/meta/shapes/` + per-file probes.
4. Repo overlay sources: `overlays/{wiki-memory,addressbook,owner-identity}/shapes/`.

## What the audit actually found (real, smaller issues)

### Finding 1 (REAL) — catalog `dc:description` cites the superseded D77
Live container `.meta` reads: "wiki-memory L3 SHACL shapes **(D77)**. **Five shapes**: page,
source, person, procedure, working." Stale: cites retired D77, says "Five shapes", names
`procedure`/`source` (procedure → `howto`). This metadata *prose* is the closest thing to an
actual defect — not the shape count the user flagged. Fix proposed in
`proposal-catalog-description.ttl`.

### Finding 2 (context) — live catalog holds 18 files, not 11
"11" was always wiki-memory-core-only. The live `/meta/shapes/` container is shared by three
overlays: wiki-memory (12 deployed: page, thing, concept, person, place, event, organization,
howto, working, resource, template, source) + addressbook (4: contact-card, group, membership,
organization-card) + owner-identity (2: webid-profile, pod-owner-preferences) = **18**.

### Finding 3 (REAL, deployment drift) — `class-extension.shacl.ttl` repo-only
`overlays/wiki-memory/shapes/class-extension.shacl.ttl` exists in source (added 2026-05-23,
`wiki:ClassExtensionShape`) but `GET .../class-extension.shacl.ttl` → **404**. Either `make reset`
needs to redeploy it, or it is intentionally repo-only. Genuine repo-vs-Pod drift — and the
*opposite* of the user's concern (a file missing from the Pod, not an extra one).

## Action taken
- No substrate modified. Audit-and-propose only.
- Wrote `proposal-catalog-description.ttl`: drop-in replacement `dc:description` citing D98 and
  describing the actual multi-overlay contents. Owner-gated N3 Patch — NOT applied.
- Flagged Finding 3 for owner resolution.

## Recommendation
Update the *note* that says "11 files", not the Pod. The Pod is internally consistent with D98.
The "11" is a frozen wiki-memory-core count from 2026-05-19; the live shared catalog now holds 18
files across three overlays. Optionally accept the Finding 1 `dc:description` fix so the container
stops citing the retired D77.
