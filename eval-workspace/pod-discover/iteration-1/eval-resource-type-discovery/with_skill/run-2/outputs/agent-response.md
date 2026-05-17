# Pod Resource Type Discovery — `http://pod.vardeman.me:3000/vault/`

## 1. Discovery Path

| # | Method | URL | Accept | Status | What I learned |
|---|---|---|---|---|---|
| 1 | HEAD | `http://pod.vardeman.me:3000/vault/` | — | 200 | Root is `pim:Storage` + LDP `BasicContainer`. `Link` rel `solid:storageDescription` points to `/vault/.well-known/solid`. Memento already advertised at the HTTP layer: `Link rel="timemap"` → `?ext=timemap`, `rel="timegate"` → self, `Vary: accept-datetime`. |
| 2 | GET | `http://pod.vardeman.me:3000/vault/.well-known/solid` | `text/turtle` | 200 | Storage description. Lists `void:vocabulary` (6 IRIs), `dct:conformsTo` two fabric profiles, four catalog pointers (`wiki:contextDocument`, `wiki:shapeCatalog`, `wiki:affordanceCatalog`, `wiki:typeIndex`), and five `rdfs:seeAlso` wiki containers. |
| 3 | GET | `http://pod.vardeman.me:3000/vault/meta/context.jsonld` | — | 200 | JSON-LD prefix registry. Confirms `wiki: urn:example:wiki#` and short-name → IRI mapping (`extends → cito:extends`, `Concept → wiki:Concept`, etc.). |
| 4 | GET | `http://pod.vardeman.me:3000/vault/meta/affordances/` | `text/turtle` | 200 | LDP container listing four affordance descriptors. |
| 5–8 | GET | `…/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` | `text/turtle` | 200 ×4 | Individual affordance descriptors with `rdf:type`, `sh:agentInstruction`, governed predicates, CONSTRUCT queries. |
| 9–13 | GET | `…/wiki/{pages,sources,people,procedures,working}/.meta` | `text/turtle` | 200 ×5 | Per-container `dct:title`, `wiki:shape` pointer, `sh:agentInstruction` describing the resource type held by each container. |
| 14 | GET | `http://pod.vardeman.me:3000/vault/meta/shapes/` | `text/turtle` | 200 | Shape catalog container — exists, but empty: no `ldp:contains` entries (gap). |
| 15 | GET | `http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl` | `text/turtle` | 404 | Confirmed shape catalog is empty in practice. |
| 16 | GET | `http://pod.vardeman.me:3000/vault/settings/publicTypeIndex` | `text/turtle` | 200 | Standard Solid TypeIndex — but registers **Phase 2 PARA classes** (`skos:Concept`, `vault:TheoryNote`, etc.) under `/vault/resources/…`, not the L3 `wiki:*` classes. Drift, per skill context. |

## 2. Resource Types

The L3 wiki-memory profile defines five typed containers. Class is implied by `wiki:shape` pointer and by container `.meta` `sh:agentInstruction`. Class names confirmed via the JSON-LD context (`Concept → wiki:Concept`, `Source → wiki:Source`, etc.).

| Class IRI | Container URL | Purpose |
|---|---|---|
| `urn:example:wiki#Page` (a.k.a. `wiki:Concept` in the context) | `http://pod.vardeman.me:3000/vault/wiki/pages/` | General wiki content — concepts, MOCs, theory notes, daily notes. Permissive shape (`wiki:PageShape`). Predicates: `dct:title`, `skos:broader` for parent, `skos:related` for lateral links. |
| `urn:example:wiki#Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | Citation records (literature notes, papers, reports). `wiki:SourceShape`. `dct:identifier` required (DOI / arXiv ID / citekey). `cito:extends`, `cito:agreesWith`, `cito:disagreesWith` for typed citation relationships. |
| `urn:example:wiki#Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` | Person records (authors, collaborators, researchers). `wiki:PersonShape`. FOAF-based. `foaf:nick` carries aliases for citekey/display-name linking. |
| `urn:example:wiki#Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | Procedural memory — agent instructions, workflows, skills, how-tos. `wiki:ProcedureShape`. `sh:agentInstruction` on `.meta` is the load-bearing field. |
| `urn:example:wiki#WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | Low-ceremony transient notes, observations, drafts (D73). Permissive `wiki:WorkingMemoryShape`. Promoted to durable containers via `mem:Crystallize`. |

A derived class is also advertised: `wiki:Hub` — materialized in-memory from `/sparql` by the hub-view CONSTRUCT when ≥3 `wiki:Resource` instances point at a node via `skos:broader`. Not a container, but a queryable class affordance.

## 3. Declared Vocabularies

From `void:vocabulary` in the storage description:

- `http://www.w3.org/2004/02/skos/core#` — SKOS
- `http://purl.org/dc/terms/` — DCTERMS
- `http://www.w3.org/ns/prov#` — PROV-O
- `https://pod.vardeman.me/vault/ontology#` — local vault ontology (Phase 2 PARA / vault types)
- `urn:example:wiki#` — wiki-memory L3 vocabulary (placeholder URN, per D79)
- `http://purl.org/spar/cito/` — CiTO

Additional vocabularies referenced (in `@context`, shape `.meta`, affordances) but not in `void:vocabulary`:
- `http://www.w3.org/ns/ldp#` (LDP — substrate-level, not application-level)
- `http://www.w3.org/ns/shacl#` (SHACL — used for `sh:agentInstruction`)
- `http://xmlns.com/foaf/0.1/` (FOAF — used by `wiki:PersonShape`)
- `http://www.w3.org/2000/01/rdf-schema#` (RDFS — `rdfs:seeAlso`, `rdfs:label`)

Conformance: `dct:conformsTo` declares `https://w3id.org/cogitarelink/fabric#CoreProfile` and `…#SolidPodProfile`; `wiki:conformsTo` declares `urn:example:wiki#L3Profile`.

## 4. Substrate Affordances

The Pod advertises four affordances at `/vault/meta/affordances/`, each typed by a distinct `wiki:*Affordance` class:

| Affordance | Type | Behavior |
|---|---|---|
| **Markdown projection listener** (`markdown-projection.ttl`) | `wiki:WriteAffordance` | **Write-time substrate behavior**: on every body+frontmatter write the listener regenerates 15 governed predicates in `.meta`. Governed set: `rdf:type`, `dct:{title,identifier,created,modified,references,subject,contributor,creator}`, `skos:{broader,related}`, `cito:{extends,agreesWith,disagreesWith}`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Agent guidance: edit body/frontmatter to express governed predicates; do NOT direct-PATCH `.meta` for them (will be overwritten — D81 Model A). Other predicates are agent-extensible. |
| **Memento time-travel** (`memento.ttl`) | `wiki:VersionAffordance` | **Time-travel**: conforms to RFC 7089. Append `?ext=timemap` to any resource URL for its TimeMap; append `?version=<14-digit-datetime>` for a specific Memento. Pattern 1.1 — OriginalResource doubles as TimeGate. (HTTP `Link rel="timemap"/"timegate"` + `Vary: accept-datetime` confirm advertisement at the protocol layer.) |
| **Hub-view CONSTRUCT** (`hub-view.ttl`) | `wiki:DerivedClassAffordance` | **Query view**: at `/sparql`, the embedded CONSTRUCT materializes `?hub a wiki:Hub` triples for any `wiki:Resource` with ≥3 incoming `skos:broader` edges (threshold = 3). Derives `wiki:Hub` class on demand. |
| **Breadcrumb-view CONSTRUCT** (`breadcrumb-view.ttl`) | `wiki:DerivedNavigationAffordance` | **Query view**: at `/sparql`, SELECT walks `skos:broader+` from a `<START>` resource URI back to the root, returning ordered ancestors as breadcrumbs. |

## 5. Inconsistencies, 404s, Surprises

1. **Empty SHACL shape catalog (referenced 404)** — Every container `.meta` declares `wiki:shape <…/meta/shapes/{page,source,person,procedure,working}.shacl.ttl>`, but `meta/shapes/` is an empty LDP container with no `ldp:contains` triples, and the referenced shape files return 404 (verified `page.shacl.ttl`). Known substrate gap per the skill notes. The load-bearing schema guidance lives in each container's `.meta sh:agentInstruction` string.
2. **Type Index drift** — `/vault/settings/publicTypeIndex` registers Phase 2 PARA classes (`skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) pointing at `/vault/resources/{concepts,theories,literature,methods}/` and `/vault/projects/`. The new L3 `wiki:{Page,Source,Person,Procedure,WorkingNote}` classes are NOT in the Type Index. Agents that trust Type Index alone would miss the wiki-memory L3 entirely. The authoritative class→container routing is the storage description's `rdfs:seeAlso` list + each container's `.meta`.
3. **Three classes for the same container** — `/vault/wiki/pages/` is described as "wiki:PageShape (permissive)" and is the target for `wiki:Page`-shaped resources, but the JSON-LD context maps the short-name `Concept` to `wiki:Concept` (not `wiki:Page`). The Page-vs-Concept naming is inconsistent between the context document and the container `.meta` — agents would have to pick one and stay consistent.
4. **Two `void:vocabulary` triples in storage description** — Cosmetic surprise: the storage description has two separate `void:vocabulary` property lines instead of one comma-joined list (legal RDF, but unusual).
5. **`mem:Crystallize` referenced but no prefix declared** — The `working/.meta` instruction mentions `mem:Crystallize` (D73 two-stage commit operation), but `mem:` is not declared in the JSON-LD context or `void:vocabulary`. Agents discovering working memory have no way to dereference `mem:Crystallize` from the substrate.
6. **`wiki:` namespace is a `urn:example:` placeholder** — Per D79, the substrate-minted `wiki:` predicates live at `urn:example:wiki#` — non-dereferenceable. Vocabulary discovery for those predicates is implicit in the JSON-LD context, not via canonical IRI dereference.
7. **Memento is advertised at *every* resource** — Not surprising once you spot it, but worth noting: the root container itself carries `Link rel="timemap"` + `Link rel="timegate"` + `Vary: accept-datetime`. Every resource on this Pod is time-travelable.
