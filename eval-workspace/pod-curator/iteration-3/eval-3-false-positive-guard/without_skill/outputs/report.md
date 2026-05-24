# Shape Catalog Audit — "8-shape catalog vs 11 files"

**Date:** 2026-05-24. **Scope:** audit-and-propose only. Nothing existing was modified, PATCHed, or deleted.

## Conclusion: the "bug" is a FALSE POSITIVE

The premise — "8 shapes but I count 11 files, that's a bug" — misreads D98. The numbers
8 and 11 describe two different things in the same decision sentence.

From decisions.md (D98, ratified 2026-05-19, supersedes D77):
> "The wiki-memory L3 shape catalog comprises **8 SHACL NodeShapes (11 shape files total)**"

- **8 NodeShapes** = PageShape, ThingShape, ConceptShape, PersonShape, PlaceShape,
  EventShape, OrganizationShape, HowToShape.
- **11 files** = those 8 + three D98-named files: working.shacl.ttl (D73), resource.shacl.ttl
  (D38 guard), template.shacl.ttl (L4 exemplar, D100).

8 != 11 is by design and written into the decision. "8-shape catalog" is shorthand for
"8 NodeShapes across 11 files" (MEMORY.md states it correctly: "8 NodeShapes / 11 files").

## Resolved against

D98 (decisions.md L658-679); live Pod ldp:contains at /vault/meta/shapes/; repo overlays/*/shapes/; FOLLOWUPS.md.

## Live Pod actually holds 18 files (not 11) — also fine

The extra 7 belong to OTHER overlays (D100: URI-independent substrate — any Type-Index
class gets full treatment), not wiki-memory L3 core:

| File(s) | Overlay | targetClass | Status |
|---|---|---|---|
| page, concept, person, place, event, organization, howto, thing | wiki-memory L3 | wiki:Page/skos:Concept/schema:* | D98 core 8 NodeShapes |
| working, resource, template | wiki-memory L3 | wiki:WorkingNote/wiki:Resource/YOURPFX:YourThing | D98 named (+3 -> 11) |
| contact-card, organization-card, membership, group | addressbook (D87) | vcard:*/org:Membership | separate overlay |
| webid-profile, pod-owner-preferences | owner-identity (D89/D90) | profile/prefs:PodOwnerPreferences | separate overlay |
| source | wiki-memory L3 (re-introduced, 1a5d293) | wiki:Source | class-extension contract example |

source.shacl.ttl: D98 retired SourceShape (->ConceptShape), but it was re-introduced via
the ClassExtensionShape contract as an L4 extension example (wiki:Source as skos:Concept
subclass). Intentional; does not inflate the D98 core count.

## ONE genuinely stale artifact (proposal, not applied)

The shape-catalog CONTAINER's own dc:description is stale:
> "wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working."

This describes the retired D77 five-shape catalog and names source/procedure (renamed to
concept/howto by D98). Never updated when D98 landed. Classification: stale label /
documentation drift, WARN (metadata only, non-blocking). Ground-truth precedence: realign
the description to the deployed 8-NodeShape catalog.

Staged proposal: proposal-shape-catalog-description.ttl (this directory) — an
InsertDeletePatch against .../meta/shapes/.meta. NOT applied (safety constraint forbids
modifying existing resources). Prefer folding into void-description.json / overlay catalog
metadata so `make reset` reproduces it.

## Recommendations

1. Do NOT delete shape files to force 8==11 — that would break the catalog. The count is correct.
2. Update the triggering note: "8-shape catalog" == "8 NodeShapes across 11 files" (D98). Both numbers right.
3. Fix the catalog dc:description via the staged proposal (the real, small drift).
4. Related tracked drift (FOLLOWUPS.md, out of scope): static void-description.json still
   has two stale rdfs:seeAlso 404s (wiki/pages/, wiki/sources/) from the pre-D98 layout.
   Same root cause; noted for curator queue, not fixed here.
