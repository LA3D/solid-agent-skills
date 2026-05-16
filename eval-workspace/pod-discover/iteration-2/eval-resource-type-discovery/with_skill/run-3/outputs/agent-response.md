# Pod Discovery Report — http://pod.vardeman.me:3000/vault/

## 1. Discovery path

| # | Method | URL | Accept | Status | Key learning |
|---|--------|-----|--------|--------|-------------|
| 1 | HEAD | `/vault/` | (default) | 200 | Link headers expose `describedby`, `storageDescription`, `timegate`/`timemap`, `updatesViaStreamingHttp2023` |
| 2 | GET  | `/vault/.well-known/solid` | text/turtle | 200 | Returns `NotImplementedHttpError` stub — well-known path is not the storage description doc itself |
| 3 | HEAD | `/vault/.well-known/solid` | — | 405 | Confirms above |
| 4 | GET  | `/vault/` | text/turtle | 200 | Pod root IS the storage description. Declares `pim:Storage / void:Dataset / dcat:DataService`, `void:vocabulary`, `void:feature`, capability catalog, 5 child containers |
| 5 | GET  | `/vault/.meta` | text/turtle | 200 | Same content as the container body |
| 6 | GET  | `/vault/meta/context.jsonld` | application/ld+json | 200 | Prefix registry + short-form term map + class aliases |
| 7 | GET  | `/vault/meta/affordances/` | text/turtle | 200 | 4 affordance descriptors |
| 8–11 | GET | `/vault/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` | text/turtle | 200 | Substrate behaviors: write (markdown-projection), derived nav (breadcrumb), derived class (hub), versioning (memento) |
| 12 | GET | `/vault/wiki/` | text/turtle | 200 | 5 wiki sub-containers |
| 13–17 | GET | `/vault/wiki/{pages,sources,people,procedures,working}/.meta` | text/turtle | 200 | Each declares `solid:forClass`, `wiki:shape`, `sh:agentInstruction` |
| 18 | GET | `/vault/meta/shapes/` | text/turtle | 200 | LDP container with 5 `.shacl.ttl` files |
| 19 | HEAD | `/vault/meta/shapes/page.shacl.ttl` | — | 200 | Content-Type text/turtle |
| 20 | GET | `/vault/meta/shapes/page.shacl.ttl` | text/turtle | 200 | `wiki:PageShape a sh:NodeShape; sh:targetClass wiki:Page` — class-based targeting (D78) |
| 21 | GET | `/vault/settings/publicTypeIndex` | text/turtle | 200 | 5 `solid:TypeRegistration` entries mapping wiki classes to wiki containers |
| 22 | GET | `/vault/wiki/pages/` | text/turtle | 200 | Empty (no instances yet) |

## 2. Resource types

Declared via Type Index (`/vault/settings/publicTypeIndex`) + container `.meta` `solid:forClass` (cross-confirmed).

| Class IRI | Short form | Container URL | Shape | Agent instruction |
|-----------|------------|---------------|-------|-------------------|
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Page` | `wiki:Page` | `/vault/wiki/pages/` | `/vault/meta/shapes/page.shacl.ttl` | General wiki content. Subclasses `wiki:Concept`, `wiki:MOC` (and future `vault:TheoryNote`) live here. Required: `dct:title`. Common: `skos:broader`, `skos:related`. CITO predicates for citation. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Source` | `wiki:Source` | `/vault/wiki/sources/` | `/vault/meta/shapes/source.shacl.ttl` | Citation records (literature, papers, reports). `dct:identifier` required. Use `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Person` | `wiki:Person` | `/vault/wiki/people/` | `/vault/meta/shapes/person.shacl.ttl` | FOAF-based. `foaf:name` preferred over `dct:title`. `foaf:nick` lists aliases. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Procedure` | `wiki:Procedure` | `/vault/wiki/procedures/` | `/vault/meta/shapes/procedure.shacl.ttl` | Procedural memory: instructions, workflows, skills. Body markdown = procedure body. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#WorkingNote` | `wiki:WorkingNote` | `/vault/wiki/working/` | `/vault/meta/shapes/working.shacl.ttl` | Low-ceremony working memory (D73). Permissive shape. Promotable via `mem:Crystallize` (deferred). |

Substrate-derived class (computed, not stored): `wiki:Hub` — any `wiki:Resource` with ≥3 incoming `skos:broader` edges. Derivation declared by the `hub-view.ttl` affordance.

## 3. Declared vocabularies (full IRIs)

### `void:vocabulary` at the storage description (pod root `/vault/`)

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (DCT)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `http://pod.vardeman.me:3000/vault/ontology/capability#` (pod-local capability)
- `http://pod.vardeman.me:3000/vault/ontology/overlay#` (pod-local overlay)

### Vocabularies referenced elsewhere (JSON-LD context + affordance/shape files)

- `http://pod.vardeman.me:3000/vault/ontology/wiki#` (wiki: — pod-local, defines `Page/Concept/MOC/Source/Person/Procedure/WorkingNote/Hub/Resource/maturity/...`)
- `http://purl.org/spar/cito/` (CITO — `extends`, `agreesWith`, `disagreesWith`)
- `http://xmlns.com/foaf/0.1/` (FOAF — used in person shape / instruction)
- `http://www.w3.org/ns/shacl#` (SHACL — `sh:agentInstruction`, `sh:targetClass`, `sh:NodeShape`)
- `http://www.w3.org/ns/solid/terms#` (Solid — `solid:TypeIndex`, `solid:forClass`, `solid:storageDescription`)
- `http://www.w3.org/ns/ldp#` (LDP — `ldp:Container`, `ldp:BasicContainer`, `ldp:contains`)

### Other namespaces seen in the pod root's self-description

- `http://www.w3.org/ns/pim/space#` (PIM — `pim:Storage`)
- `http://rdfs.org/ns/void#` (VoID — `void:Dataset`, `void:vocabulary`, `void:feature`)
- `http://www.w3.org/ns/dcat#` (DCAT — `dcat:DataService`)
- `https://w3id.org/cogitarelink/fabric#` (fabric — `fabric:CoreProfile`, `fabric:SolidPodProfile`, `fabric:LDPBrowse`)

## 4. Substrate affordances advertised

Discovered at `/vault/meta/affordances/`:

| Descriptor | Type | Purpose |
|------------|------|---------|
| `markdown-projection.ttl` | `wiki:WriteAffordance` | Body-projection listener (D58/D71/D81). Substrate governs 14 predicates derived from body wikilinks + frontmatter (`rdf:type`, `dct:{title,identifier,created,modified,references,subject,contributor,creator}`, `skos:{broader,related}`, `cito:{extends,agreesWith,disagreesWith}`, `wiki:maturity`, `prov:wasGeneratedBy`). Frontmatter keys projected: type/created/modified/maturity/aliases/identifier/citekey. Class-hint table at `/vault/meta/context.jsonld`. |
| `hub-view.ttl` | `wiki:DerivedClassAffordance` | Derives `wiki:Hub` membership: `wiki:Resource` with ≥3 incoming `skos:broader` edges. CONSTRUCT query embedded; agent runs externally. |
| `breadcrumb-view.ttl` | `wiki:DerivedNavigationAffordance` | `skos:broader+` ancestor walk. SELECT query embedded; agent runs externally. |
| `memento.ttl` | `wiki:VersionAffordance` | RFC 7089 time-travel. `?ext=timemap` for TimeMap; `?version=<14-digit-datetime>` for a specific Memento. Pattern 1.1 — OriginalResource doubles as TimeGate. |

Also advertised at the protocol layer on every resource:

- `Link: rel="timegate"` / `rel="timemap"` and `Vary: accept-datetime` — Memento conformance (D67)
- `Link: rel="updatesViaStreamingHttp2023"` — Solid Notifications Protocol streaming HTTP channel
- `Accept-Patch: text/n3, application/sparql-update` — N3 Patch and SPARQL Update accepted

## 5. Inconsistencies, 404s, surprises

1. **Skill's "Known gap #1" appears resolved.** Skill says "Type Index has Phase 2 PARA types; use rdfs:seeAlso containers + container .meta instead." Actual `/vault/settings/publicTypeIndex` registers `wiki:Page/Source/Person/Procedure/WorkingNote` — wiki-memory L3 classes only. No PARA types observed.
2. **Skill's "Known gap #2" appears resolved.** Skill says "Shape catalog at /vault/meta/shapes/ holds no .shacl.ttl files." Actual container has all five (`page/source/person/procedure/working.shacl.ttl`), each returning 200 with `Content-Type: text/turtle`. Read of `page.shacl.ttl` confirms `wiki:PageShape a sh:NodeShape; sh:targetClass wiki:Page` (D78).
3. **Skill says storage description = `/vault/.well-known/solid`.** That URL returns a `NotImplementedHttpError` describing itself as "Only supports descriptions of storage containers." The actual storage description is reachable from `Link: rel="storageDescription"` on a sub-resource, but for the pod root the description data lives on the root container itself (`/vault/` or `/vault/.meta`). Treat the storage description as a *container affordance*, not an independent URL.
4. **`void:vocabulary` at the storage description does not list CITO, FOAF, or wiki:** — yet these are extensively used in the JSON-LD context, affordance descriptors, and SHACL shapes. D49 says every used vocab MUST be declared; the pod root's `void:vocabulary` list is narrower than the actually-used set. Mild D49 conformance gap.
5. **`rdfs:seeAlso` links to the five wiki containers (claimed by the skill) were NOT observed** on `/vault/` or `/vault/.meta`. Wiki container discovery instead happens via (a) `ldp:contains` from the pod root → `wiki/` → 5 sub-containers, and (b) the Type Index registrations. The skill's claim of "5× rdfs:seeAlso" at the storage description is not borne out by the current pod state.
6. **Pod's declared `void:vocabulary` includes two pod-local namespaces** (`<ontology/capability#>`, `<ontology/overlay#>`) and a `cap:catalog` pointer to `/vault/meta/capabilities/` — neither documented by the skill. These hint at an unexplored capability-catalog discovery surface separate from the affordance catalog.
7. **No SPARQL endpoint is hosted by the Pod.** Both derived-view affordances (`hub-view`, `breadcrumb-view`) explicitly instruct the agent to run queries in its own engine pointed at the wiki containers. Agents must bring Comunica or equivalent; query-the-pod isn't an option (RQ-Pod-4 territory).
8. **All wiki containers are currently empty.** `/vault/wiki/pages/` returns only the container self-description with no `ldp:contains` of resources. Discovery yields the *type system*, not yet a populated knowledge graph.
9. **Memento + Notifications advertised everywhere**, including on shape and affordance files — every resource is versioned and subscribable. Useful for change-tracking shape evolution.
