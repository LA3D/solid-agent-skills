# pod-curator report — "8-shape catalog vs 11 shape files"

Date: 2026-05-24
Pod: https://pod.vardeman.me/vault/
Mode: audit-and-propose (read + create only; no existing resource modified)

## Conclusion (short version)

**The reported "8 vs 11" bug is a FALSE POSITIVE.** The note ("8-shape catalog") and the
file count are correct at their own granularity. D98 — the canonical decision — states
verbatim: *"The wiki-memory L3 shape catalog comprises 8 SHACL NodeShapes (11 shape files
total)."* Eight is a count of `sh:NodeShape`s defined for wiki-memory L3; the 11 is the file
count *as of D98 (2026-05-19)*. They describe two different things, not a contradiction. Per
the false-positive guard, the canonical source already reconciles the apparent conflict, so
there is nothing to "clean up" in the count claim.

**But the guard surfaced a genuine, different stale claim that the surface framing masked:**
the shape-catalog container's own `.meta` `dc:description` is a retired D77-era string. That
is the real drift, and I drafted a `mem:RealignAction` proposal for it.

## What I resolved against (ground-truth precedence)

1. **Deployed Pod / overlay (operational truth)** — `GET /vault/meta/shapes/` and each file.
2. **Decisions log (intended truth)** — D98 in
   `cogitarelink-solid/.claude/skills/decision-lookup/decisions.md:658`.
3. **Prose summaries (most lag-prone)** — the user's note; the skill's own summary.

The skill playbook (`references/playbook.md`, line 27) names this exact case as a known false
positive, which corroborated the resolution.

## Findings

### Finding 1 — "8-shape catalog != 11 files" -> mem:FalsePositive (withdrawn)

- Claim under test: notes say "8-shape catalog"; counting shows 11 (the user) / 18 (current
  live) shape files. Looks like a contradiction.
- Guard result: D98 says "8 SHACL NodeShapes (11 shape files total)." Correct at its
  granularity. The 8 NodeShapes are confirmed live on the Pod:
  page (wiki:Page), thing (schema:Thing), concept (skos:Concept), person (schema:Person),
  place (schema:Place), event (schema:Event), organization (schema:Organization),
  howto (schema:HowTo) — exactly the D98 set.
- Disposition: WITHDRAWN as mem:FalsePositive. No repair to the count claim. Rewriting a
  correct-at-its-granularity statement is worse than leaving it.

### Finding 2 — catalog .meta dc:description is a retired D77 string -> mem:SupersededConcept (proposed)

This is the actual stale artifact the surface framing hid.

- Location: https://pod.vardeman.me/vault/meta/shapes/.meta
- Current value:
  dc:description "wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working."
- Why stale: D98 supersedes D77 and retired the five-shape catalog. The named shape set
  ("page, source, person, procedure, working") no longer matches: procedure is now howto,
  source is no longer one of the core NodeShapes (re-introduced as a class-extension
  example), and the catalog now carries the 8 L3 NodeShapes plus several overlay shapes. The
  container's dc:modified is 2026-05-23 but this description text was never updated — classic
  prose lag on a live resource.
- Class: mem:SupersededConcept (a retired decision still named as current state).
- Repair direction: prose -> current reality (realign description; cite D98; keep the D77
  mention only as supersession history).
- Pod-side vs repo-side: the .meta is HTTP-PATCHable, but on this Pod the catalog container
  and its metadata are produced at setup from the overlay (overlays/wiki-memory/). To survive
  `make reset`, the durable fix is repo-side — update whatever overlay step writes this
  container's dc:description. The proposal records both the intended new text and a note to
  fold it into the overlay. NOT applied — proposal only, per two-stage-commit (D73).
- Proposal file: catalog-meta-d77-description.ttl (staged in this outputs dir; not yet
  written to the Pod — landing it under /vault/wiki/working/curator-proposals/ is the next
  human-gated step).

## Live catalog inventory (for the record — 18 files, 17 NodeShape target classes)

D98 core 8 NodeShapes: page, thing, concept, person, place, event, organization, howto.

Beyond the D98 set (later overlays / decisions; legitimately present, not bugs):
- working (wiki:WorkingNote, D73), resource (wiki:Resource, D38 LDP guard),
  template (L4 exemplar, D100), source (wiki:Source — re-introduced 2026-05-23 via the
  class-extension contract, NOT the retired D77 SourceShape).
- AddressBook overlay: contact-card (vcard:Individual), organization-card
  (vcard:Organization), group (vcard:Group), membership (org:Membership) — D87/D88.
- Owner-identity overlay: webid-profile (targets the WebID node), pod-owner-preferences
  (prefs:PodOwnerPreferences) — D89/D90.

So the catalog has grown well past "11 files" — the user's "11" is itself a stale count (it
was the D98-era total). Honest current statement: 8 wiki-memory L3 NodeShapes, served from a
catalog that now also carries working/resource/template plus the addressbook and
owner-identity overlay shapes (18 files total).

## Auditor gaps noted (out of scope here, worth a future pod-audit pass)

1. source.shacl.ttl's sh:agentInstruction points at
   </vault/meta/shapes/class-extension.shacl.ttl>, which 404s — a dangling reference
   (mem:DanglingReference). The wiki:ClassExtensionShape may live under a different filename
   or container; needs locating then realigning the pointer.
2. The shape catalog has no machine-readable count/label asserting "8 NodeShapes" — the only
   label is the (now stale) container dc:description. A prof:/void-style catalog manifest
   would make the count auditable rather than prose-only.

## What I did / did NOT do

- DID: read the Pod, the decisions log, the skill + playbook; verified the 8 NodeShapes live;
  identified the real stale artifact; drafted one mem:RealignAction proposal.
- DID NOT: modify, PATCH, or DELETE any existing resource. No write to the Pod was made. The
  proposal TTL is staged in this outputs directory only.
