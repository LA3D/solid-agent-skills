# pod-curator triage report — 2026-05-23 full triage

**Pod:** https://pod.vardeman.me/vault/
**Auditor:** cogitarelink-solid/scripts/pod_audit.py (JSON work queue)
**Constraint:** audit-and-propose only — no existing substrate resource modified.
Proposals published under /vault/wiki/working/curator-proposals/2026-05-23T1430/.

## Work queue (counts by severity)

| Severity | Count |
|---|---|
| ERROR | 0 |
| WARN | 11 |
| INFO | 0 |
| Total | 11 |

The 11 WARN findings collapse into 3 coherent repair clusters (one proposal each
— 8 of the findings are the identical defect on sibling resources):

| Cluster | Findings | Constraint |
|---|---|---|
| A. storage-description seeAlso dangling | 2 | resolve:seeAlso |
| B. storage-description missing entry-point prose | 1 | StorageDescriptionShape:agentInstruction |
| C. addressbook query affordances untyped | 8 | descriptor:untyped |

## Per-finding triage

### Cluster A — resolve:seeAlso (2 findings)

| Location | mem:stalenessClass | Direction | Proposal |
|---|---|---|---|
| /vault/wiki/pages/ (404) | mem:DanglingReference | pointer -> reality (repo edit) | 01-storage-description-seealso-dangling.ttl |
| /vault/wiki/sources/ (404) | mem:DanglingReference | pointer -> reality (repo edit) | 01-storage-description-seealso-dangling.ttl |

Ground truth: wiki/pages/ + wiki/sources/ were D98-renamed to wiki/concepts/
(verified live: pages/, sources/ = 404, concepts/ = 200; Type Index routes both
skos:Concept and wiki:Source to concepts/). Fix is repo-side in
css/config/void-description.json (storage description PATCH returns 405 — static).
Drop both dead pointers, add ../wiki/concepts/.

Notable: the 2026-05-23 D77->D98 realignment exemplar
(overlays/wiki-memory/examples/realign-2026-05-23.ttl, entry #2) already recorded
this exact fix — but the live Pod still serves the stale seeAlso. The exemplar
trace was written; the config edit was never crystallized. This re-flag confirms it.

### Cluster B — StorageDescriptionShape:agentInstruction (1 finding)

| Location | mem:stalenessClass | Direction | Proposal |
|---|---|---|---|
| /vault/ | mem:ProseDrift (contract gap) | text -> reality (repo edit) | 02-storage-description-agentinstruction.ttl |

The storage description has every catalog pointer but no sh:agentInstruction
giving an arriving agent the discovery order. Composed entry-point prose from the
live pointers (context -> typeIndex -> affordanceCatalog -> shapeCatalog ->
profileDocument) + the "no SPARQL endpoint, run queries client-side" caveat.
Repo-side (static config / storage-patch overlay).

### Cluster C — descriptor:untyped (8 findings)

| Location | mem:stalenessClass | Direction | Proposal |
|---|---|---|---|
| contact-find-by-name.ttl | mem:ProseDrift (contract gap) | text -> reality (repo edit) | 03-addressbook-descriptors-untyped.ttl |
| contact-find-by-group.ttl | same | same | same |
| contact-find-by-email.ttl | same | same | same |
| contact-find-by-affiliation.ttl | same | same | same |
| contact-find-by-orcid.ttl | same | same | same |
| org-find-by-ror.ttl | same | same | same |
| org-find-by-name.ttl | same | same | same |
| bridge-card-to-wiki.ttl | same | same | same |

All 8 are typed only `a wiki:Affordance` with sh:agentInstruction + wiki:selectQuery;
they work but lack the AffordanceDescriptorShape contract (prof:ResourceDescriptor,
prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy). Reconstructed the
contract from the conformant sibling markdown-projection.ttl; installedBy =
overlay#addressbook (they ship from the addressbook overlay). Repo-side fix in
overlays/addressbook/affordances/*.ttl (pod-side PATCH would be overwritten by
make reset).

Escalation surfaced, not blocking: the wikirole SKOS scheme has no read/query role
(only write-/version-/derived-class-/derived-navigation-affordance). Rather than
mis-assign an existing role, the proposal adds an additive wikirole:query-affordance
concept (skos:broader :affordance). This is a substrate-vocabulary extension a
reviewer should confirm before applying.

## False positives

None. The two resolve:seeAlso findings were dereferenced before flagging
(confirmed 404 + cross-checked against the live container set and Type Index); the
count-of-shapes guard from the playbook (the "8-shape / 11-file" trap) did not
apply to any finding in this queue.

## Escalations to human (mem:ContradictionDetected)

None — no two equally-authoritative sources disagreed. The one item needing a
human decision is the new wikirole:query-affordance concept (Cluster C), raised
inside proposal 03 as a vocabulary-extension recommendation, not a contradiction.

## Status

All findings proposed, not fixed. Every fix is repo-side (the storage description
and overlay-served descriptors are not durably HTTP-PATCHable), so each proposal is
a written recommendation naming the file + before/after lines. Apply by editing the
named repo files and running make reset; crystallization is gated on review.

## Proposals published

- /vault/wiki/working/curator-proposals/2026-05-23T1430/01-storage-description-seealso-dangling.ttl
- /vault/wiki/working/curator-proposals/2026-05-23T1430/02-storage-description-agentinstruction.ttl
- /vault/wiki/working/curator-proposals/2026-05-23T1430/03-addressbook-descriptors-untyped.ttl
