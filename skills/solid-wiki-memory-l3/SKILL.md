---
name: solid-wiki-memory-l3
description: Wiki-memory L3 (memory profile) operations on a Solid Pod — class-based wiki page reads/writes, dual-layer linking (markdown wikilinks + .meta projection per D58/D71), foaf:primaryTopic bridging from wiki pages to WebID/AddressBook identity. Use whenever working with /vault/wiki/{pages,sources,people,procedures,working}/, when creating agentic-memory records that need to be both LLM-readable (markdown) and SPARQL-queryable (.meta triples), or when bridging a wiki person page to its L1 WebID + L2 AddressBook contact card. Includes the RQ-Pod-4 explicit-source SPARQL workaround for .meta traversal.
---

# Wiki-Memory L3 Operations (Minimal Scope This Sprint)

This sprint ships **the subset of wiki-memory L3 needed by the setup-owner workflow**: discovery, the `wiki:Person` class path, and the L3→L1/L2 bridge procedure. The two-stage commit (D73 working-memory + `mem:Crystallize`), full coverage of the other shape classes (Concept/Source/Procedure/WorkingMemory/Page), and memory-substrate triggers (D74) are deferred to a follow-on **Memory Structuring Sprint**.

## Quick reference

| Container | Class | URL |
|---|---|---|
| Pages | `wiki:Page` | `/vault/wiki/pages/<slug>/index.md` |
| Sources | `wiki:Source` | `/vault/wiki/sources/<slug>/index.md` |
| People | `wiki:Person` | `/vault/wiki/people/<slug>/index.md` |
| Procedures | `wiki:Procedure` | `/vault/wiki/procedures/<slug>/index.md` |
| Working | `wiki:WorkingMemory` | `/vault/wiki/working/<slug>/index.md` |

Shape catalog: `/vault/meta/shapes/{resource,concept,source,person,procedure,working}.shacl.ttl` (5+resource per D77).
JSON-LD context (predicate registry): `/vault/meta/context.jsonld` (D79).
Type Index: `/vault/settings/publicTypeIndex` — `solid:forClass wiki:Person ; solid:instance /vault/wiki/people/`, etc.

## Step 1 — Discover

```
solid-pod info /vault/                          # storage description
  → wiki:shapeCatalog        → /vault/meta/shapes/
  → wiki:contextDocument     → /vault/meta/context.jsonld
  → wiki:typeIndex           → /vault/settings/publicTypeIndex
  → rdfs:seeAlso (×5)        → /vault/wiki/{pages,sources,people,procedures,working}/
solid-pod shapes /vault/meta/shapes/            # list shapes with sh:agentInstruction
```

## Concept — Three-layer stratification (D70)

Wiki-memory L3 is the **memory profile** layer:
- **L1 Pod substrate**: LDP / WAC / RDF (what every Solid Pod has)
- **L2 Memory substrate**: seven invariants (bounded branching, tiered retrieval, lifecycle metadata, …)
- **L3 Memory profile**: wiki-memory is the canonical reference profile, the page-as-unit + dual-layer + class-based pattern

This skill operates at L3. When a wiki page bridges to an `L1` WebID, it's reaching down through L2 into the Pod substrate.

## Concept — Dual-layer linking (D58/D71)

A wiki page's body is markdown with typed wikilinks:

```markdown
This concept builds on [[Progressive Disclosure]]{.concept} and cites
[[@hu-2026-beyond-rag]]{.source} and [[charles]]{.person}.
```

On write, `MarkdownProjectionListener` (D58/D71) projects the wikilinks into
the page's `.meta` graph as typed RDF predicates:

```turtle
</vault/wiki/pages/this/index.md>
    wiki:relatesTo  </vault/wiki/pages/progressive-disclosure/index.md> ;
    cito:cites      </vault/wiki/sources/hu-2026-beyond-rag/index.md> ;
    wiki:mentions   </vault/wiki/people/charles/index.md> .
```

The same write produces *both* the LLM-readable markdown body *and* SPARQL-queryable `.meta` triples. The agent's job is to write good body wikilinks; the substrate generates the structured edges.

**Predicate-level governance** (D81 Model A): each shape declares which predicates the substrate owns (projects/validates) and which the agent owns (free-form). The agent only writes wikilinks; the projector emits the typed predicates.
