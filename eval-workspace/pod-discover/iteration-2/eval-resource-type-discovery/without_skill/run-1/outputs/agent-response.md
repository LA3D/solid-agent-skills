# Pod Resource Type Discovery — Final Report

Pod: `http://pod.vardeman.me:3000/vault/`

## 1. Discovery Path

| # | Request | Status | What I learned |
|---|---|---|---|
| 1 | `GET /vault/` `Accept: text/turtle` | 200 | Root is a `pim:Storage`. `Link` headers advertise: `storageDescription` → `.well-known/solid`, `describedby` → `.meta`, `timemap`/`timegate` (Memento). Root graph declares `void:vocabulary`, `void:feature fabric:LDPBrowse`, and `capability:catalog meta/capabilities/`. `ldp:contains` lists `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`. |
| 2 | `GET /vault/.well-known/solid` `Accept: text/turtle` | **501** | Advertised but not implemented. |
| 3 | Same with `Accept: application/ld+json` | **501** | Confirms not a content-negotiation problem. |
| 4 | `GET /vault/.meta` | 200 | Same root graph; confirms substrate-level declarations live here rather than at `.well-known/solid`. |
| 5 | `GET /vault/meta/` | 200 | Pod-level metadata container: `capabilities/`, `affordances/`, `shapes/`, `context.jsonld`. |
| 6 | `GET /vault/meta/capabilities/` | 200 | L1 substrate capability catalog: `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl`. |
| 7 | `GET /vault/meta/affordances/` | 200 | L3 affordance catalog: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`. |
| 8 | `GET /vault/meta/shapes/` | 200 | SHACL shape catalog (D77): `page`, `source`, `person`, `procedure`, `working`. |
| 9 | `GET /vault/meta/context.jsonld` | 200 | Canonical JSON-LD context — prefix→IRI map and short-form predicate aliases. |
| 10 | `GET /vault/wiki/` | 200 | Application root; five typed containers `pages/`, `sources/`, `people/`, `procedures/`, `working/`. |
| 11 | `GET /vault/settings/` | 200 | Contains `publicTypeIndex`. |
| 12 | `GET /vault/settings/publicTypeIndex` | 200 | Five `solid:TypeRegistration`s mapping class → instance container. **This is the authoritative class→container index.** |
| 13–14 | `GET /vault/profile/`, `/vault/ontology/` | 200 | Profile (`card`) and ontology files. |
| 15–18 | The four affordance descriptors | 200 | Detailed write-time behavior, time travel, and derived-view affordances (see §4). |
| 19–23 | Each `wiki/{pages,sources,people,procedures,working}/` | 200 | Each container's `.meta` declares `solid:forClass`, `wiki:shape`, and an `sh:agentInstruction`. All currently empty of instances. |
| 24 | `GET /vault/ontology/wiki.ttl` | 200 | Wiki RDFS class hierarchy (see §2). |
| 25 | `GET /vault/ontology/overlay.ttl` | 200 | Overlay/installable-application vocabulary. |
| 26–28 | The three capability descriptors | 200 | L1 substrate primitives backing each affordance (see §4). |

## 2. Resource Types

The Pod publishes a single base type plus five concrete L3 types (with three further subtypes of `wiki:Page`), all in the namespace `http://pod.vardeman.me:3000/vault/ontology/wiki#`:

| Class | Container (instances live here) | Shape | Notes |
|---|---|---|---|
| `wiki:Resource` | — (abstract root) | — | Abstract root; never asserted directly. |
| `wiki:Page` | `http://pod.vardeman.me:3000/vault/wiki/pages/` | `meta/shapes/page.shacl.ttl` | General wiki content. |
| `wiki:Concept` (`rdfs:subClassOf wiki:Page`, `skos:Concept`) | `http://pod.vardeman.me:3000/vault/wiki/pages/` | (Page shape) | Most common page kind. |
| `wiki:MOC` (`rdfs:subClassOf wiki:Page`) | `http://pod.vardeman.me:3000/vault/wiki/pages/` | (Page shape) | Map-of-content hub page. |
| `wiki:Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | `meta/shapes/source.shacl.ttl` | Citation records; `dct:identifier` required (DOI/arXiv/citekey). |
| `wiki:Person` (also `foaf:Person`) | `http://pod.vardeman.me:3000/vault/wiki/people/` | `meta/shapes/person.shacl.ttl` | `foaf:name` preferred; `foaf:nick` for aliases. |
| `wiki:Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `meta/shapes/procedure.shacl.ttl` | Procedural memory; body markdown IS the procedure. |
| `wiki:WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | `meta/shapes/working.shacl.ttl` | Permissive working memory (D73). |
| `wiki:Hub` (derived) | — | — | Derived class — a `wiki:Resource` with ≥3 incoming `skos:broader`. Never asserted directly; materialized by client running the hub-view affordance's CONSTRUCT. |

The Solid Type Index (`/vault/settings/publicTypeIndex`) advertises exactly the five non-abstract base classes (`Page`, `Source`, `Person`, `Procedure`, `WorkingNote`) and their containers. `wiki:Concept` and `wiki:MOC` are subclasses of `wiki:Page` and share its container.

## 3. Vocabularies Declared

From the root `.meta` `void:vocabulary` set, plus the JSON-LD context and ontology files:

Externally hosted (W3C / community standards):
- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (DCT)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `http://purl.org/spar/cito/` (CiTO — citation typing)
- `http://xmlns.com/foaf/0.1/` (FOAF)
- `http://www.w3.org/ns/ldp#` (LDP)
- `http://www.w3.org/ns/solid/terms#` (Solid terms — Type Index, storage description)
- `http://www.w3.org/ns/pim/space#` (`pim:Storage`)
- `http://rdfs.org/ns/void#` (VoID)
- `http://www.w3.org/ns/dcat#` (DCAT)
- `http://www.w3.org/ns/shacl#` (SHACL — `sh:agentInstruction`, shape catalog)
- `http://www.w3.org/ns/posix/stat#` (posix mtime/size)

Pod-local (hosted at this Pod):
- `http://pod.vardeman.me:3000/vault/ontology/wiki#` — wiki-memory L3 classes/properties (`wiki:Page`, `wiki:Source`, `wiki:Person`, `wiki:Procedure`, `wiki:WorkingNote`, `wiki:Concept`, `wiki:MOC`, `wiki:Hub`, `wiki:Resource`, `wiki:maturity`, `wiki:WriteAffordance`, `wiki:DerivedClassAffordance`, `wiki:DerivedNavigationAffordance`, `wiki:VersionAffordance`, `wiki:governs`, `wiki:projectsFromFrontmatter`, `wiki:classHintTable`, `wiki:shape`, `wiki:requiresCapability`, `wiki:installedBy`).
- `http://pod.vardeman.me:3000/vault/ontology/capability#` — substrate capability primitives (`cap:ContentProjection`, `cap:DerivedView`, `cap:TimeTravel`, `cap:catalog`, `cap:version`, `cap:contentType`, `cap:implementedBy`, `cap:configurationShape`).
- `http://pod.vardeman.me:3000/vault/ontology/overlay#` — installable-overlay vocabulary (`overlay:Overlay`, install declarations).
- `https://w3id.org/cogitarelink/fabric#` — conformance profiles (`fabric:CoreProfile`, `fabric:SolidPodProfile`, `fabric:LDPBrowse`).

## 4. Substrate Affordances Advertised

Four affordances at `/vault/meta/affordances/`, each backed by a capability primitive at `/vault/meta/capabilities/`:

### Write-time behavior

- **`markdown-projection.ttl`** — `wiki:WriteAffordance` backed by `cap:ContentProjection` v1.0 (implemented by `css/extensions/markdown-projection`). On every write of `text/markdown`, the substrate parses YAML frontmatter and body wikilinks and projects triples into the resource's `.meta`. The governed predicate set is exactly: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Class-hint table at `meta/context.jsonld`. Instruction: edit body+frontmatter rather than PATCHing `.meta` for any governed predicate; other predicates are agent-extensible. (D58/D71/D81.)

### Time-travel

- **`memento.ttl`** — `wiki:VersionAffordance` backed by `cap:TimeTravel` v1.0 (`css/extensions/memento`), conforming to **RFC 7089**. Every resource is versioned. Append `?ext=timemap` for the TimeMap; append `?version=<14-digit-datetime>` for a specific Memento. Pattern 1.1 — OriginalResource doubles as TimeGate. Discoverable via `Link rel=timemap` / `rel=timegate` and `Vary: accept-datetime` on every resource. Tombstones return 410 Gone on plain GET but their TimeMap still resolves.

### Query views (client-executed)

- **`hub-view.ttl`** — `wiki:DerivedClassAffordance`. Derives `wiki:Hub` membership: a `wiki:Resource` becomes a `wiki:Hub` when ≥3 distinct resources point at it via `skos:broader`. Threshold: 3. Publishes a SPARQL CONSTRUCT for the agent to run.
- **`breadcrumb-view.ttl`** — `wiki:DerivedNavigationAffordance`. Walks `skos:broader+` from a starting IRI to the root via a published SPARQL SELECT.

Both derived views are backed by `cap:DerivedView` v1.0 with `cap:implementedBy <urn:substrate:descriptor-publication-only>` — i.e., **the Pod publishes the query templates but does not execute SPARQL server-side**. The agent must bring its own SPARQL 1.1 engine (Comunica recommended) and point it at this Pod's `wiki/*/` containers as sources.

## 5. Inconsistencies, 404s, Surprises

- **`/vault/.well-known/solid` → 501 Not Implemented.** Every resource on the Pod advertises this URL in its `Link: rel="storageDescription"` header (per D44, this is supposed to be the entry point). In practice the CSS instance only "supports descriptions of storage containers" and returns 501 for the well-known slot. The substrate vocabulary declarations that the storage description was supposed to host live in the root container's `.meta` graph instead. An agent following the D44 cold-start ritual literally will hit a dead end and must fall back to GETting `/vault/` (or `/vault/.meta`) directly.
- **No SPARQL endpoint.** The `derived-view` capability is explicit: `cap:implementedBy <urn:substrate:descriptor-publication-only>`. Agents that assume a server-side SPARQL endpoint per D43 will not find one on this Pod.
- **All five wiki containers are empty.** No `ldp:contains` instance entries in `pages/`, `sources/`, `people/`, `procedures/`, or `working/`. The Pod is fully configured but un-populated — typical state immediately after `make reset` before any vault import has run.
- **Three discovery surfaces agree but live in different places.** Class → container routing is duplicated in: (a) the Solid Type Index at `settings/publicTypeIndex`; (b) each container's `.meta` (`solid:forClass`, `wiki:shape`); (c) the JSON-LD context's type alias table. An agent has three independent ways to learn the same mapping. This is intentional progressive disclosure, not redundancy, but it is worth noting that no single response gives the agent the whole picture.
- **`Vary: accept-datetime` and `?ext=timemap` links are on every response**, including container listings and `.meta` resources — i.e., Memento applies uniformly to containers, sidecars, and content alike.
- **`Allow: OPTIONS, HEAD, GET, POST` on containers; `Accept-Post: */*`.** Containers accept arbitrary content types via POST. `.meta` resources support `PATCH` with `text/n3` and `application/sparql-update`, but for governed predicates (per the markdown-projection affordance) the agent is instructed to edit the body rather than PATCH directly.
