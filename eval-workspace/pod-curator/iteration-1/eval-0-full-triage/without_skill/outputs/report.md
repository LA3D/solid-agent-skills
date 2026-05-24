# pod-audit triage report — https://pod.vardeman.me/vault/

**Date:** 2026-05-23
**Auditor:** Claude (audit-and-propose; read-only against live Pod, proposals only)
**Tool:** scripts/pod_audit.py (D104 substrate self-description walker), --shapes-dir shapes/substrate/, inference="none"

## Result summary

`0 ERROR · 11 WARN · 0 INFO` — the audit passes (non-zero exit only on ERROR). All 11 findings are WARN-level substrate-quality items. Raw output saved as audit-findings.json / audit-findings.md.

The 11 WARNs fall into three distinct problems:

| # | Finding(s) | Count | Severity | Root cause |
|---|---|---|---|---|
| F1 | StorageDescriptionShape:agentInstruction | 1 | WARN | Storage description carries no entry-point sh:agentInstruction (D104 sweep item) |
| F2 | resolve:seeAlso on wiki/pages/, wiki/sources/ | 2 | WARN | Stale rdfs:seeAlso — pre-D98 container names that 404 after source→concept migration |
| F3 | descriptor:untyped on 8 addressbook affordances | 8 | WARN | Addressbook descriptors typed only wiki:Affordance, escaping the prof:ResourceDescriptor contract |

Plus one latent side-finding uncovered while triaging F3 (see below).

---

## F1 — Storage description has no entry-point agentInstruction

StorageDescriptionShape requires (as a WARN) an sh:agentInstruction on the pim:Storage node so an arriving agent learns how to use the catalog pointers. The live .well-known/solid has the pointers (wiki:affordanceCatalog, typeIndex, contextDocument, shapeCatalog, profileDocument) but no prose telling an agent what to do with them.

Fix: add sh:agentInstruction to the pim:Storage subject. Drafted in proposal-1-storage-description.ttl.

Delivery caveat: the storage description is generated statically via Components.js (StaticStorageDescriber / void-description.json) and PATCH returns 405 (per project MEMORY). So this is NOT an N3 patch to the live resource — it lands in css/config and takes effect on make reset. The proposal documents the desired end-state triples.

---

## F2 — Two stale rdfs:seeAlso targets (404)

The storage description's rdfs:seeAlso lists <../wiki/pages/> and <../wiki/sources/>, both now 404 (pre-D98 names). Confirmed live wiki/ layout by HEAD-checking each container:

```
pages   -> 404      concepts      -> 200
sources -> 404      people        -> 200
                    places        -> 200
                    events        -> 200
                    organizations -> 200
                    procedures    -> 200
                    working       -> 200
```

Current seeAlso set is {pages, sources, people, procedures, working} — so beyond the two dead links it is ALSO missing concepts/, places/, events/, organizations/. Leftover from the D98 source→concept migration: the rename and the newer L3 containers were never reflected in seeAlso.

Fix: replace the rdfs:seeAlso object list with the 7 live containers. Drafted in proposal-1-storage-description.ttl (same file/subject as F1). Same static-describer delivery caveat.

Why only WARN, not ERROR: the Type Index (wiki:typeIndex) is the authoritative class→container router; rdfs:seeAlso is a browsing convenience. Still worth fixing — a dead link at the entry point is what a cold-arriving agent trips on.

---

## F3 — Eight addressbook affordance descriptors are untyped

All 8 addressbook affordances (contact-find-by-{name,orcid,email,affiliation,group}, org-find-by-{name,ror}, bridge-card-to-wiki) are typed only wiki:Affordance. AffordanceDescriptorShape targets prof:ResourceDescriptor, so SHACL never sees them and the descriptor contract (prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy, intent prose) goes unenforced. The walker catches this with a catalog-membership ground-truth check. The wiki-memory descriptors all carry dual wiki:*Affordance , prof:ResourceDescriptor typing; the addressbook overlay never adopted it.

Modeling decision: these 8 are SPARQL query surfaces — each carries a wiki:selectQuery run client-side (Comunica) with --default-graph-uri at /vault/contacts/people.ttl etc. They are NOT HTTP ?ext= dispatch surfaces, so NOT wiki:SearchAffordance (SearchAffordanceShape requires wiki:dispatchPattern + wiki:targetContainer, which these lack). Modeled as a new role wikirole:query-affordance rather than forcing the search subtype.

Fix (two parts):
- proposal-2-wikirole-query-affordance.ttl — adds the wikirole:query-affordance SKOS concept (prerequisite).
- proposal-3-<name>.ttl (x8) — each re-typed descriptor adds: a prof:ResourceDescriptor, prof:hasRole wikirole:query-affordance, rdfs:label, dct:conformsTo <http://www.w3.org/TR/dx-prof/>, wiki:installedBy <…overlay#addressbook>. Existing sh:agentInstruction and wiki:selectQuery preserved verbatim.

These land in overlays/addressbook/affordances/*.ttl (manifest already lists all 8) so make reset reproduces them.

Validation: parsed all 8 re-typed descriptors and ran them against affordance-descriptor.shacl.ttl with inference="none": all 8 parse and conform to AffordanceDescriptorShape, and all now carry prof:ResourceDescriptor (descriptor:untyped WARN clears).

---

## Side-finding (latent — not in audit output)

While picking a role for F3, found that the shipped wiki-search-grep.ttl descriptor declares prof:hasRole wikirole:search-affordance, but wikirole:search-affordance does NOT exist in the role scheme (absent from both the live /ontology/wikirole doc and overlays/wiki-memory/vocabulary/wikirole.ttl). Dangling prof:hasRole target. The audit's prof:hasRole check only requires an IRI (nodeKind), so it passes — but the concept is undefined. proposal-2 adds wikirole:search-affordance alongside wikirole:query-affordance to close this gap.

Recommendation: tighten the SHACL prof:hasRole constraint to additionally require the target be skos:inScheme wikirole: (or a prof:ResourceRole), so future dangling-role descriptors are caught automatically.

---

## Proposed files in this directory

| File | Addresses |
|---|---|
| audit-findings.json / audit-findings.md | raw audit output |
| proposal-1-storage-description.ttl | F1 (entry-point agentInstruction) + F2 (seeAlso fix) |
| proposal-2-wikirole-query-affordance.ttl | new query-affordance role + missing search-affordance role |
| proposal-3-contact-find-by-name.ttl | F3 |
| proposal-3-contact-find-by-orcid.ttl | F3 |
| proposal-3-contact-find-by-email.ttl | F3 |
| proposal-3-contact-find-by-affiliation.ttl | F3 |
| proposal-3-contact-find-by-group.ttl | F3 |
| proposal-3-org-find-by-name.ttl | F3 |
| proposal-3-org-find-by-ror.ttl | F3 |
| proposal-3-bridge-card-to-wiki.ttl | F3 |

## Suggested apply order (reviewer; nothing applied here)

1. proposal-2 first — role concepts must exist before descriptors reference them.
2. proposal-3 (x8) — re-typed descriptors into overlays/addressbook/affordances/.
3. proposal-1 — into css/config static describer (void-description.json), effective on make reset.
4. Re-run make audit — expect 0 ERROR · 0 WARN (or 1 WARN if proposal-1 deferred).

All proposals are drafts for review. No live substrate resource was modified, patched, or deleted.
