# Proposal 01 — Storage-description fixes (3 WARN findings)

**Resource (DO NOT MODIFY directly):** `https://pod.vardeman.me/vault/.well-known/solid`
**Findings addressed:**
- `StorageDescriptionShape:agentInstruction` — no entry-point `sh:agentInstruction`
- `resolve:seeAlso` — `…/vault/wiki/pages/` → 404
- `resolve:seeAlso` — `…/vault/wiki/sources/` → 404

> SAFETY: This is a proposal only. The storage description is static (Components.js
> `void-description.json`; runtime PATCH returns 405 per MEMORY). It must be changed at
> the **source overlay**, not by patching the live resource. The proposed change is
> already half-present in the repo (see Root-cause), so applying it is a re-deploy, not a
> hand-edit.

## Finding A — stale `rdfs:seeAlso` targets (2 WARN)

### Observed (live storage description)
```
rdfs:seeAlso <../wiki/pages/>, <../wiki/sources/>, <../wiki/people/>,
             <../wiki/procedures/>, <../wiki/working/> .
```
`wiki/pages/` → 404, `wiki/sources/` → 404. The remaining three resolve (200).

### Root cause
The D98 source→concept migration renamed/retired containers. Live wiki containers are:
`concepts/ people/ places/ events/ organizations/ procedures/ working/` (all 200).
`pages/` and `sources/` no longer exist; `skos:Concept` **and** `wiki:Source` both route
to `wiki/concepts/` in the Type Index (`#reg0-wiki-memory`, `#reg1-wiki-memory`).

The **source overlay is already correct**:
`overlays/wiki-memory/storage-patch.ttl` inserts the right set —
`concepts/ people/ places/ events/ organizations/ procedures/ working/`. The deployed
Pod's storage description predates the migrated patch and was never re-synced. This is a
**stale deployed artifact**, not a stale source. `make reset` should reproduce the
corrected set.

### Staleness classification (per `stale_memory_realignment`)
Ground-truth precedence: the **live container set** + **Type Index** are ground truth; the
storage-description `seeAlso` list is the stale pointer. Realign the pointer to ground
truth. False-positive guard cleared: the targets genuinely 404 and the canonical
replacements genuinely exist.

### Proposed corrected `seeAlso` (matches the already-fixed overlay source)
```turtle
<../>
    rdfs:seeAlso <../wiki/concepts/> ,
                 <../wiki/people/> ,
                 <../wiki/places/> ,
                 <../wiki/events/> ,
                 <../wiki/organizations/> ,
                 <../wiki/procedures/> ,
                 <../wiki/working/> .
```

### How to apply (re-deploy, not hand-patch)
1. Confirm `overlays/wiki-memory/storage-patch.ttl` already carries the corrected set (it does, verified 2026-05-24).
2. `make reset` to rebuild from the overlay sources, OR re-run the wiki-memory overlay apply against the live Pod's storage description if a non-destructive re-sync path exists.
3. Re-run `make audit` — the two `resolve:seeAlso` WARNs should clear.

No content edit to the live `.well-known/solid` by hand; the change rides the existing overlay machinery.

## Finding B — missing entry-point `sh:agentInstruction` (1 WARN)

### Observed
The storage description carries catalog pointers (`affordanceCatalog`, `typeIndex`,
`contextDocument`, `shapeCatalog`, `profileDocument`, `contactCatalog`, `templateCatalog`,
`extensionGuide`) but no prose telling an arriving agent how to use them. D104-sweep item.

### Proposed addition (to `overlays/wiki-memory/storage-patch.ttl` inserts block)
```turtle
<../>
    sh:agentInstruction """You have reached the storage description — the entry point for
this Pod (Solid storage description, D44). To orient: (1) GET wiki:contextDocument
(</vault/meta/context.jsonld>) for the prefix→IRI registry and short-form predicates;
(2) GET wiki:typeIndex (</vault/settings/publicTypeIndex>) for class→container routing —
this is how you find where a given rdf:type lives; (3) GET wiki:shapeCatalog
(</vault/meta/shapes/>) for the SHACL contracts your writes must satisfy, each carrying
sh:agentInstruction; (4) GET wiki:affordanceCatalog (</vault/meta/affordances/>) for the
machine-actionable substrate behaviours (search, projection, time-travel, crystallize) —
invoke one with `solid-pod invoke <url> <affordance>`; (5) for the human profile of the
wiki, GET wiki:profileDocument (</vault/wiki/index.md>). Every step is standard LDP +
Solid Protocol.""" .
```
(Add `@prefix sh: <http://www.w3.org/ns/shacl#> .` to the patch header.)

### Rationale
`sh:agentInstruction` is a non-validating SHACL §8.3 characteristic — legal on any node,
including a `pim:Storage`. It mirrors the per-shape and per-affordance instruction pattern
already used across the substrate, making the storage description self-describing for a
cold-arriving agent (RQ-Discovery-1). The text only references pointers that already exist
and resolve.

### Severity note
WARN, not ERROR — discovery still works without it (the catalog pointers are present and
typed). This is a usability/self-description improvement.
