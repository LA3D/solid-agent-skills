# Proposal 05 — Non-dereferenceable `wiki:installedBy` overlay IRIs (audit-blind finding)

**Not flagged by `pod_audit.py`** (it HEAD-checks catalog pointers + seeAlso, not
`wiki:installedBy` objects). Surfaced during triage. **Lower priority** — record and decide.

## Finding
Every affordance descriptor records provenance via
`wiki:installedBy <…/ontology/overlay#wiki-memory>` (or `#addressbook` after Proposal 02).
Neither overlay IRI dereferences:
```
GET https://pod.vardeman.me/vault/ontology/overlay  → 404 (NotFoundHttpError)
```
So the installer-provenance edge points into a vocabulary namespace that isn't published on
the Pod. The descriptors are internally consistent (the IRI is a stable identifier), but the
substrate cannot dereference its own installer provenance — a self-description gap.

## Why it's only a recommendation, not an ERROR
- `wiki:installedBy` is a provenance edge; an opaque-but-stable IRI is defensible (cf. ROR,
  ORCID — identifiers that needn't be the dereference target). Per the URI-conformance skill,
  Pod-as-namespace-authority *prefers* dereferenceable IRIs but doesn't strictly require it
  for every minted term.
- The overlay manifests (`overlays/*/manifest.ttl`) ARE the authoritative descriptions of
  these subjects; they're just not served at the IRI.

## Two options (pick one — this is a design decision for the owner)
**Option A — publish the overlay descriptor.** Serve a small Turtle doc at
`…/ontology/overlay` describing each `overlay:*` subject (label, the overlay's purpose,
`dct:hasPart` of installed artifacts). Makes `installedBy` dereferenceable; aligns with
Pod-as-namespace-authority (D84). Source: a new `ontology/overlay.ttl` deployed like the
other vocab stubs.

**Option B — accept opaque installer IRIs.** Document in FOLLOWUPS that `overlay#*` IRIs are
stable-but-opaque provenance identifiers by design, and (optionally) widen the audit walker
to NOT flag them. No deploy change.

## Recommendation
Defer to the owner. Option A is the cleaner self-describing-substrate answer and is cheap
(one vocab stub), but it's net-new scope, not a regression. If chosen, gate it behind the
same re-deploy as Proposals 01–04 so the audit runs once at the end.

## Audit-walker note
If Option B is chosen and you still want visibility, add an INFO-level (not WARN) cross-check
to `pod_audit.py` reporting any `wiki:installedBy` object that doesn't resolve, classified as
"opaque provenance IRI — confirm intentional." Draft in Proposal 06.
