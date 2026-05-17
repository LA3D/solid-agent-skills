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

## Procedure — Read a wiki page

```
solid-pod read /vault/wiki/people/<slug>/index.md
   → returns:  content  (markdown body)
               meta     (JSON-LD .meta with wiki:Person + projected predicates)
               affordances: { describedby: "/vault/wiki/people/<slug>/index.md.meta", ... }
```

The `solid-pod read` command auto-fetches the `describedby` `.meta` and returns both body + meta in one shot. For SPARQL access to the `.meta` graph specifically, use:

```
solid-pod sparql https://pod.vardeman.me/vault/ "SELECT ..." \
    --default-graph-uri https://pod.vardeman.me/vault/wiki/people/<slug>/index.md.meta
```

## Procedure — Create a wiki Person page

Class-based dispatch (D78): the Type Index says `wiki:Person → /vault/wiki/people/`, the shape catalog says `wiki:Person → person.shacl.ttl`. The minimal `wiki:Person` body is markdown + a few `.meta` triples:

```
mint slug (lowercase + hyphens; from prefs:wikiSlug or by ask)
build markdown body (minimal seed):
  # <Full Name>

  Pod-owner agentic-memory record. The canonical identity is the
  Pod-owner WebID `[[charles-webid]]{.webid}` (or however the bridge
  predicate convention names this — see below). Operational identity
  in the AddressBook at `[[charles-contact]]{.contact}`.

  ## Notes
  (free-form; this is the L3 deep-context layer)

solid-pod create /vault/wiki/people/ --slug <slug>/index.md \
    --content-type text/markdown \
    --body "<markdown body>" \
    --meta "
@prefix wiki: <https://pod.vardeman.me/vault/ontology/wiki#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

<> a wiki:Person ;
   foaf:name \"<Full Name>\" ;
   foaf:primaryTopic </vault/profile/card#me> ;
   owl:sameAs </vault/contacts/Person/<contact-uuid>.ttl#this> .
"
```

The `--meta` argument is patched via `solid:inserts` into the `.meta` sidecar. The `foaf:primaryTopic <WebID>` triple is the L3 → L1 bridge — declared at write time, the wiki page now formally asserts "the WebID is my primary subject."

**Slug collision**: if `/vault/wiki/people/<slug>/index.md` already exists (HTTP 200 on the URL), ask the human to disambiguate before overwriting. If the existing page already has `foaf:primaryTopic <WebID>`, treat it as the bridge target — return the existing IRI without writing.

**Deferred to Memory Structuring Sprint**: two-stage commit via `/vault/wiki/working/` permissive shape → `mem:Crystallize` → durable container. For setup-owner, write the Person page directly to its durable container — the use case is bootstrap, not in-flight knowledge consolidation.

## Procedure — Bridge a wiki Person page to identity (L1 + L2)

Called by `solid-owner-identity` Phase D. The wiki page (L3) asserts its
membership in the identity stack via two `.meta` triples:

```
solid-pod patch /vault/wiki/people/<slug>/index.md.meta --insert "
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

</vault/wiki/people/<slug>/index.md>
    foaf:primaryTopic   </vault/profile/card#me> ;
    owl:sameAs          </vault/contacts/Person/<contact-uuid>.ttl#this> .
"
```

The reverse direction is asserted by `solid-owner-identity` Phase E via the
webid-enrich template:

- `<WebID> foaf:isPrimaryTopicOf <wiki-page>` — endorsed by Solid WebID Profile §3.1 for "extended profile documents"
- `<wiki-page> a wiki:Person` — *inlined in the WebID response* so an LLM dereferencing the WebID recognizes the L3 agentic-memory record in a single round-trip (follow-the-nose discovery)

**Symmetry table:**

| Direction | Predicate | Lives in |
|---|---|---|
| WebID → wiki page | `foaf:isPrimaryTopicOf` | `/vault/profile/card` (body) |
| WebID → wiki page type | `<wiki-page> a wiki:Person` | `/vault/profile/card` (body, inlined) |
| Wiki page → WebID | `foaf:primaryTopic` | `<wiki-page>.meta` |
| Wiki page → contact card | `owl:sameAs <contact-#this>` | `<wiki-page>.meta` |
| WebID → contact card | `owl:sameAs <contact-#this>` | `/vault/profile/card` (body) |
| Contact card → WebID | `vcard:url [ vcard:WebId ; vcard:value <WebID> ]` | contact-card body (SolidOS convention, optional) |

**Idempotence:** before patching, `solid-pod read /vault/wiki/people/<slug>/index.md.meta` and check for existing `foaf:primaryTopic` and `owl:sameAs` triples. Drop any duplicates from the `--insert` argument (CSS returns 409 Conflict otherwise).

## Procedure — Query the wiki graph

Comunica's link-traversal follows `ldp:contains` but **skips `describedby` Link headers on `text/markdown` resources** (RQ-Pod-4). To SPARQL over `.meta` content, pass explicit `default-graph-uri` parameters pointing at each `.meta` URL:

```
solid-pod sparql https://pod.vardeman.me/vault/ "
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX wiki: <https://pod.vardeman.me/vault/ontology/wiki#>

    SELECT ?page ?subjectWebID WHERE {
      ?page a wiki:Person ;
            foaf:primaryTopic ?subjectWebID .
    }
" \
    --default-graph-uri https://pod.vardeman.me/vault/wiki/people/charles/index.md.meta
```

For batch queries across all wiki Person pages, list each `.meta` URL — or use the `solid-pod sparql` auto-discovery against the `/vault/wiki/people/` container, which enumerates contained resources and fetches each `.meta`.

## Known gaps

- **RQ-Pod-4**: Comunica `describedby` skip on `text/markdown`. Workaround: explicit `--default-graph-uri`. Materialized SPARQL index deferred.
- **RQ-Listener-1**: CSS `FileDataAccessor.writeMetadataFile()` races `MarkdownProjectionListener` — projected predicates on write don't always land if the agent reads the `.meta` immediately after write. Workaround: re-read after a short wait, or trust the write succeeded and proceed.
- **RQ-Pod-6**: `.meta` richness vs query overhead unbenchmarked beyond 100 resources.

## Deferred to Memory Structuring Sprint

This sprint ships only what setup-owner needs (`wiki:Person` create + bridge). The follow-on sprint covers:

- Two-stage commit (D73): `/vault/wiki/working/` permissive shape + `mem:Crystallize` durable promotion
- Full coverage of `wiki:Concept`, `wiki:Source`, `wiki:Procedure`, `wiki:Page`, `wiki:WorkingMemory` create procedures
- Memory-substrate triggers (D74): `mem:*` AS2 vocab on LDN inbox, Solid Notifications dispatch by `rdf:type`
- Compile-once procedures (D72): substrate maintains compiled state
- Lifecycle metadata invariants from L2 (when/why a memory was made; access counters; etc.)
- Empirical guidance from Rung 1.5 eval feeding back into the skill text
