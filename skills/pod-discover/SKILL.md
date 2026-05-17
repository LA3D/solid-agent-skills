---
name: pod-discover
description: Cold-start discovery workflow for a Solid Pod running wiki-memory L3 — follow the storage description Link header from any URL to reach the affordance catalog, JSON-LD context, and typed wiki containers. Use this skill whenever you arrive on a Solid Pod and need to learn what kinds of resources it holds, what vocabularies it uses, what affordances the substrate offers, and where to read or write content. Triggers on any task involving Solid Pod navigation, discovering resource types, learning a Pod's capabilities, or first contact with an unknown Pod.
---

# Pod Discovery — Cold-Start Arrival

A Solid Pod running wiki-memory L3 describes itself through standard HTTP affordances. You do not need prior knowledge of its schema — every step is a `GET` against a URL discoverable from the previous step. This skill walks you through the discovery chain from any URL to the typed containers + substrate affordances.

## Quick reference

**Entry point**: Any resource's `Link` header carries `rel="http://www.w3.org/ns/solid/terms#storageDescription"` (the spec-mandated slot, per D44). Follow it.

**Reachable from the storage description**:
| Pointer | Predicate | Purpose |
|---|---|---|
| JSON-LD context | `wiki:contextDocument` | Canonical prefix→IRI registry; short-form predicate names |
| Affordance catalog | `wiki:affordanceCatalog` | Per-content-type substrate behaviors (D52) |
| Type Index | `wiki:typeIndex` | Standard Solid class → container routing (D8) |
| Shape catalog | `wiki:shapeCatalog` | SHACL shape files (D77) |
| Wiki containers | `rdfs:seeAlso` (×5) | `/wiki/{pages,sources,people,procedures,working}/` (D76) |

**Two key vocabularies declared via `void:vocabulary`** (D49): standard W3C (SKOS, DCT, PROV, CITO, FOAF) + pod-local `wiki:` namespace.

## Step 1: Find the storage description

Hit any URL on the Pod with a `HEAD` (or `GET` and read headers) and look for the `solid:storageDescription` Link.

```bash
curl -sSI http://pod.vardeman.me:3000/vault/ | grep -i '^link:'
```

You'll see several `Link:` headers. The one that matters:

```
Link: <http://pod.vardeman.me:3000/vault/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"
```

This is the entry point. The Pod has told you where its self-description lives.

Other useful Links you'll see in passing:
- `describedby` → this resource's `.meta` sidecar (where metadata lives)
- `timemap` → RFC 7089 TimeMap for time-travel queries (D61)
- `type` → LDP/PIM types (`pim:Storage`, `ldp:Container`, etc.)

## Step 2: Read the storage description

```bash
curl -sS -H "Accept: text/turtle" http://pod.vardeman.me:3000/vault/.well-known/solid
```

You'll get Turtle that declares:

```turtle
<../> a pim:Storage, void:Dataset, dcat:DataService ;
    dct:conformsTo fabric:SolidPodProfile ;
    void:vocabulary skos:, dct:, prov:, cito:, foaf:, wiki: ;
    wiki:contextDocument     </vault/meta/context.jsonld> ;
    wiki:affordanceCatalog   </vault/meta/affordances/> ;
    wiki:typeIndex           </vault/settings/publicTypeIndex> ;
    wiki:shapeCatalog        </vault/meta/shapes/> ;
    rdfs:seeAlso </vault/wiki/pages/>, </vault/wiki/sources/>,
                 </vault/wiki/people/>, </vault/wiki/procedures/>,
                 </vault/wiki/working/> .
```

Five things to extract:
1. The list of `void:vocabulary` IRIs — these are the namespaces the Pod uses
2. `wiki:contextDocument` URL — fetch this next (Step 3) to get short-form names
3. `wiki:affordanceCatalog` URL — substrate behaviors (Step 4)
4. The five `rdfs:seeAlso` container URLs — the typed wiki containers (Step 5)
5. Note that `wiki:typeIndex` and `wiki:shapeCatalog` exist but read the "Known substrate gaps" section below before relying on them

## Step 3: Read the JSON-LD context (vocabulary registry)

```bash
curl -sS http://pod.vardeman.me:3000/vault/meta/context.jsonld
```

Returns a JSON-LD `@context` block. Two parts:

**Prefix registry** — maps short prefixes to full namespace IRIs:
```json
"wiki":  "urn:example:wiki#",
"dct":   "http://purl.org/dc/terms/",
"skos":  "http://www.w3.org/2004/02/skos/core#",
"cito":  "http://purl.org/spar/cito/",
"foaf":  "http://xmlns.com/foaf/0.1/",
"prov":  "http://www.w3.org/ns/prov#"
```

**Short-form aliases** — let you use compact names in JSON-LD documents:
```json
"title":      "dct:title",
"references": "dct:references",
"broader":    "skos:broader",
"related":    "skos:related",
"contributor":"dct:contributor",
"extends":    "cito:extends",       ← NOT wiki:extends. The Pod uses W3C CITO.
"supports":   "cito:agreesWith",
"criticizes": "cito:disagreesWith",
"Concept":    "wiki:Concept",
"Source":     "wiki:Source",
"Person":     "wiki:Person",
"Procedure":  "wiki:Procedure",
"WorkingNote":"wiki:WorkingNote",
"Hub":        "wiki:Hub"
```

**Why this matters**: when you encounter a `.meta` triple like `<resource> cito:extends <other>`, the JSON-LD context tells you "this is what the Pod's L3 means by `extends`." Hybrid vocabulary stance per D79 — DCT/SKOS/CITO/FOAF/PROV by default; `wiki:*` only for genuine gaps.

## Step 4: List the affordance catalog (substrate behaviors)

```bash
curl -sS -H "Accept: text/turtle" http://pod.vardeman.me:3000/vault/meta/affordances/
```

Returns an `ldp:Container` listing 4 affordance descriptors:

| Descriptor | Type | Purpose |
|---|---|---|
| `markdown-projection.ttl` | `wiki:WriteAffordance` | Body markdown wikilinks project to `.meta` triples on write (D58/D71) |
| `hub-view.ttl` | `wiki:DerivedClassAffordance` | A `wiki:Resource` becomes a `wiki:Hub` when ≥3 children point at it via `skos:broader` (D80) |
| `breadcrumb-view.ttl` | `wiki:DerivedNavigationAffordance` | Substrate-computed navigation chains |
| `memento.ttl` | `wiki:VersionAffordance` | RFC 7089 time-travel via `?ext=timemap` and `?version=<14-digit-datetime>` (D61) |

Fetch any descriptor for its `sh:agentInstruction`. Example:

```bash
curl -sS -H "Accept: text/turtle" http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl
```

The markdown-projection descriptor lists exactly which predicates the substrate writes (`wiki:governs`) and which frontmatter keys it reads (`wiki:projectsFromFrontmatter`). This is D81 Model A: substrate owns governed predicates; the agent owns everything else.

`sh:agentInstruction` on the markdown-projection descriptor:
> "Substrate writes the predicates listed in wiki:governs. To express any of those, edit the body+frontmatter; do not PATCH .meta directly. Other predicates are agent-extensible."

## Step 5: Read container `.meta` files for class-level guidance

Each of the five wiki containers has a `.meta` sidecar carrying its class-level `sh:agentInstruction`. Fetch the container URL with `Accept: text/turtle`:

```bash
curl -sS -H "Accept: text/turtle" http://pod.vardeman.me:3000/vault/wiki/sources/
```

Returns:
```turtle
<> dc:title "Wiki Sources" ;
   wiki:shape </vault/meta/shapes/source.shacl.ttl> ;
   sh:agentInstruction "Citation records (literature notes, papers, reports).
     Shape: wiki:SourceShape. dct:identifier required (DOI, arXiv ID, or citekey).
     Use cito:extends, cito:agreesWith, cito:disagreesWith for typed citation relationships." .
```

The five containers and what they hold:

| Container | Class | Use for |
|---|---|---|
| `/vault/wiki/pages/` | `wiki:Page` (permissive) | General concepts, MOCs, theory notes, daily notes |
| `/vault/wiki/sources/` | `wiki:Source` | Citation records — `dct:identifier` required; CITO predicates for relationships |
| `/vault/wiki/people/` | `wiki:Person` | FOAF-based, with `foaf:nick` aliases for cross-system linking |
| `/vault/wiki/procedures/` | `wiki:Procedure` | Procedural memory — body carries the procedure |
| `/vault/wiki/working/` | `wiki:WorkingNote` (permissive) | Low-ceremony scratchpad; promotes to durable via two-stage commit (D73) |

The container `.meta` `sh:agentInstruction` is what you read to know what to write. It cites the shape file under `wiki:shape` — but see "Known substrate gaps" below before fetching that file.

## Step 6: Decision tree — what to do next

```
Want to read a specific resource?
  → GET <resource-url>; read its describedby Link → <resource-url>.meta for triples

Want to query across a container?
  → GET <container-url>?...   (Comunica SPARQL, see pod-query skill once it exists)

Want to write a new resource?
  → POST to /vault/wiki/working/ (low-ceremony) OR target container directly
    (substrate validates per the container's SHACL shape — see pod-write skill once it exists)

Want to time-travel?
  → Append ?ext=timemap or ?version=<14-digit-datetime> to any resource URL
    (per memento.ttl agentInstruction)

Want to know which predicates the substrate owns vs you own?
  → Read /vault/meta/affordances/markdown-projection.ttl wiki:governs list
```

## Known substrate gaps (current Pod state, 2026-05-15)

The Pod is at Rung 1.4 — substrate scaffolding shipped but two surfaces aren't fully populated:

1. **Type Index drift** — `wiki:typeIndex` at `/vault/settings/publicTypeIndex` still registers Phase 2 PARA types (`skos:Concept` → `/vault/resources/concepts/`, `vault:TheoryNote` → `/vault/resources/theories/`, etc.) rather than the 5 wiki classes pointing at `/vault/wiki/*` containers. Don't rely on Type Index for class-to-container routing on this Pod yet. Use the 5 `rdfs:seeAlso` containers from the storage description + each container's `.meta` `sh:agentInstruction` instead.

2. **Shape catalog empty** — `wiki:shapeCatalog` at `/vault/meta/shapes/` exists as a container but holds no `.shacl.ttl` files. Container `.meta` files reference shapes (e.g., `wiki:shape </vault/meta/shapes/source.shacl.ttl>`) but the targeted files return 404. The class-level `sh:agentInstruction` in each container's `.meta` carries the load-bearing guidance until shape files are served.

These are tracked as substrate work — they don't affect the discovery chain through the storage description + affordance catalog + JSON-LD context + container `.meta` paths, which all work.

## Key principle

**The Pod describes itself. Follow the affordances.** Every URL you fetch should be reachable from a previous URL via a Link header, `rdfs:seeAlso`, or a typed predicate (`wiki:contextDocument`, `wiki:affordanceCatalog`, etc.). If you find yourself guessing a path (`/api/...`, `/admin/...`, `/data/...`), stop — re-read the storage description for the right pointer.

The discovery chain is short (3 hops to reach the substantive content):
1. `GET <any-url>` → `solid:storageDescription` Link
2. `GET storage-description` → catalog pointers + container links
3. `GET <catalog or container>` → the actual capabilities

## Output reporting

When asked to report what you discovered, include:
- **Discovery path**: every URL you fetched, in order, with what you learned from each
- **Resource types**: the 5 wiki classes from the container `.meta` `sh:agentInstruction` (or whatever subset of containers you reached)
- **Vocabularies**: the `void:vocabulary` list from the storage description
- **Affordances**: the 4 entries in the affordance catalog, with one-line summaries from their `sh:agentInstruction`
- **Anything broken**: 404s, stale data, contradictions you noticed
