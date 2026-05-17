# Solid Pod Discovery Report — http://pod.vardeman.me:3000/vault/

## 1. Discovery Path

I followed the standard Solid discovery chain: container Link headers → storage description → catalogs advertised by the storage description → typed containers.

| Step | Method | URL | Accept | Status | What I learned |
|---|---|---|---|---|---|
| 1 | GET | `/vault/` | `text/turtle` | 200 | Root is `pim:Storage` + `pim:Workspace` + `ldp:BasicContainer`. Link headers expose **storage description** at `/vault/.well-known/solid`, **Memento** (`?ext=timemap` TimeMap, `;rel="timegate"`), **describedby** `.meta`, and **Solid Notifications** (StreamingHTTPChannel2023). Ten top-level containers listed via `ldp:contains`. |
| 2 | GET | `/vault/.well-known/solid` | `text/turtle` | 200 | The router. Declares vocabularies, feature flag, **type index** location, **shape catalog** location, **affordance catalog** location, **JSON-LD context** document, and `rdfs:seeAlso` to five `wiki/*` typed containers. |
| 3 | GET | `/vault/meta/context.jsonld` | `application/ld+json` | 200 | Prefix map + alias table — the canonical vocabulary registry that the agent should use when constructing claims. |
| 4 | GET | `/vault/meta/affordances/` | `text/turtle` | 200 | Lists four affordance descriptors: markdown-projection, memento, hub-view, breadcrumb-view. |
| 5 | GET | `/vault/meta/affordances/{markdown-projection,memento,hub-view,breadcrumb-view}.ttl` | `text/turtle` | 200 | Each affordance describes a substrate capability (write-time projection, time-travel, two derived SPARQL views). |
| 6 | GET | `/vault/meta/shapes/` | `text/turtle` | 200, but empty | Shape catalog is advertised but holds **zero** shape resources. |
| 7 | HEAD | `/vault/meta/shapes/{page,source,person,procedure,working,resource}.shacl.ttl` | — | **404** | Wiki container metas reference these shapes, but the files do not exist. |
| 8 | GET | `/vault/settings/publicTypeIndex` | `text/turtle` | 200 | Five class→container registrations. |
| 9 | HEAD/GET | `/vault/wiki/{pages,sources,people,procedures,working}/` and their `.meta` | `text/turtle` | 200 | Five class-typed wiki containers with `sh:agentInstruction` and `wiki:shape` pointer (broken). |
| 10 | GET | `/vault/resources/`, `/vault/resources/concepts/`, others | `text/turtle` | 200 | Vault PARA layout: resources + sub-containers (concepts/theories/literature/methods/people/external), each with their own `sh:agentInstruction`. |
| 11 | GET | `/vault/procedures/`, `/vault/procedures/shapes/` | `text/turtle` | 200 | Found a **second** shape location not advertised by the storage description — holds the only real shape file (`concept-note.ttl`). |
| 12 | GET | `/vault/profile/card` | `text/turtle` | 200 | WebID, declaring `solid:oidcIssuer`, `pim:storage`, `solid:publicTypeIndex`. |
| 13 | GET | `/vault/ontology/` | `text/turtle` | 200 | Two ontology stubs: `vault-ontology.ttl`, `solid-pod-profile.ttl`. |

## 2. Resource Types

### Registered in the Type Index (`/vault/settings/publicTypeIndex`)

| Class | Instance container |
|---|---|
| `skos:Concept` | `http://pod.vardeman.me:3000/vault/resources/concepts/` |
| `vault:TheoryNote` (`<https://pod.vardeman.me/vault/ontology#TheoryNote>`) | `http://pod.vardeman.me:3000/vault/resources/theories/` |
| `vault:LiteratureNote` | `http://pod.vardeman.me:3000/vault/resources/literature/` |
| `vault:MethodNote` | `http://pod.vardeman.me:3000/vault/resources/methods/` |
| `vault:Project` | `http://pod.vardeman.me:3000/vault/projects/` |

### Wiki-memory L3 typed containers (storage description `rdfs:seeAlso`)

Each is typed by the wiki ontology and bears a `sh:agentInstruction` describing what belongs there:

| Class (wiki vocabulary) | Container | Purpose (from `sh:agentInstruction`) |
|---|---|---|
| `wiki:Page` / general wiki content | `/vault/wiki/pages/` | "General wiki content (concepts, MOCs, theory notes, daily notes). Shape: wiki:PageShape." |
| `wiki:Source` | `/vault/wiki/sources/` | "Citation records. Shape: wiki:SourceShape. `dct:identifier` required." |
| `wiki:Person` | `/vault/wiki/people/` | "Person records (authors, collaborators). FOAF-based, `foaf:nick` for aliases." |
| `wiki:Procedure` | `/vault/wiki/procedures/` | "Procedural memory: agent instructions, workflows, skills. Body markdown is documentation." |
| `wiki:WorkingNote` | `/vault/wiki/working/` | "Low-ceremony working memory for transient notes. Permissive shape. Use `mem:Crystallize` to promote." |

### Other discoverable containers (not in type index but with `dct:type` or instructions)

- `/vault/resources/external/` — `ldp:BasicContainer` for external resources.
- `/vault/resources/people/` — overlaps with `/vault/wiki/people/` (two organisations of the same conceptual space).
- `/vault/areas/`, `/vault/archive/` — PARA scaffolding.
- `/vault/procedures/queries/` and `/vault/procedures/shapes/` — agent-procedural memory.
- `/vault/ontology/` — local ontology stubs.

## 3. Vocabularies Declared

From `void:vocabulary` on the storage description, plus the JSON-LD context:

| Prefix | IRI |
|---|---|
| skos | `http://www.w3.org/2004/02/skos/core#` |
| dct | `http://purl.org/dc/terms/` |
| prov | `http://www.w3.org/ns/prov#` |
| cito | `http://purl.org/spar/cito/` |
| vault | `https://pod.vardeman.me/vault/ontology#` |
| wiki | `urn:example:wiki#` |
| foaf | `http://xmlns.com/foaf/0.1/` |
| ldp | `http://www.w3.org/ns/ldp#` |
| sh | `http://www.w3.org/ns/shacl#` |
| pim | `http://www.w3.org/ns/pim/space#` |
| solid | `http://www.w3.org/ns/solid/terms#` |
| void | `http://rdfs.org/ns/void#` |
| dcat | `http://www.w3.org/ns/dcat#` |

Also referenced as conformance targets: `https://w3id.org/cogitarelink/fabric#CoreProfile`, `https://w3id.org/cogitarelink/fabric#SolidPodProfile`, `urn:example:wiki#L3Profile`.

Feature flag advertised: `https://w3id.org/cogitarelink/fabric#LDPBrowse`.

## 4. Substrate Affordances

Discovered under `/vault/meta/affordances/`:

| Descriptor | Type | Capability |
|---|---|---|
| `markdown-projection.ttl` | `wiki:WriteAffordance` | **Write-time projection from markdown body+frontmatter into `.meta` triples.** Lists 15 predicates the substrate governs (`rdf:type`, `dct:title/identifier/created/modified/references/subject/contributor/creator`, `skos:broader/related`, `cito:extends/agreesWith/disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`). Frontmatter keys projected: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Agent instruction: edit the body+frontmatter to write these predicates; do not PATCH `.meta` directly. Other predicates are agent-extensible. |
| `memento.ttl` | `wiki:VersionAffordance` | **RFC 7089 time-travel.** Append `?ext=timemap` to any resource URL for its TimeMap; append `?version=<14-digit-datetime>` for a specific Memento. Pattern 1.1 — OriginalResource doubles as TimeGate. Confirmed by `Vary: accept-datetime`, `rel="timemap"`, and `rel="timegate"` Link headers on every resource. |
| `hub-view.ttl` | `wiki:DerivedClassAffordance` | **Derived `wiki:Hub` class** computed via CONSTRUCT at `/sparql`. A `wiki:Resource` becomes a `wiki:Hub` when ≥3 distinct `wiki:Resource` instances point at it via `skos:broader`. |
| `breadcrumb-view.ttl` | `wiki:DerivedNavigationAffordance` | **Breadcrumb chain walker** at `/sparql`. Given a start URI, returns the `skos:broader+` ancestor chain. |

Additional substrate signals from headers (every resource):
- `Link: …; rel="describedby"` → `.meta` sidecar
- `Link: …; rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"` → **Solid Notifications StreamingHTTPChannel2023**
- `Accept-Patch: text/n3, application/sparql-update` on `.meta` and other RDF resources → write protocol

## 5. Inconsistencies, 404s, and Surprises

1. **Shape catalog is advertised but empty.** `void:vocabulary` and `wiki:shapeCatalog` both point at `/vault/meta/shapes/`. The container itself returns 200 and its `.meta` description says it holds "five shapes: page, source, person, procedure, working" — but the container has **no `ldp:contains`** and probing the five expected shape files returns 404 for every one. Each `/vault/wiki/{pages,sources,people,procedures,working}/.meta` advertises a `wiki:shape` pointing at one of these missing files. This is a real broken pointer in the substrate's self-description.
2. **A second shape directory exists but is not advertised.** `/vault/procedures/shapes/` contains exactly one shape (`concept-note.ttl`, 2.5 KB) that is **not** referenced by the storage description, the type index, or any `wiki:shape` predicate I encountered. So the only shape file actually present on the Pod is the one no resource points to.
3. **No SPARQL endpoint URL declared.** Two affordances (`hub-view`, `breadcrumb-view`) state `wiki:invokedAt </sparql>` — a relative reference resolving to `http://pod.vardeman.me:3000/sparql`. The storage description does **not** declare this endpoint, and CSS itself does not host SPARQL — per the project context the Comunica sidecar lives on port 8080. Following the affordance descriptor literally would hit a 404. Either the descriptor's base IRI is wrong or the Pod is meant to be discovered with an out-of-band `comunica` source.
4. **Two parallel typed-resource organisations.** The type index points at `/vault/resources/{concepts,theories,literature,methods}/` (the legacy PARA layout, also confirmed via `dct:type vault:Resources`); the storage description `rdfs:seeAlso` points at `/vault/wiki/{pages,sources,people,procedures,working}/` (the wiki-memory L3 layout). Both are reachable, both have `sh:agentInstruction` strings, neither cross-references the other. An agent has to know which to write into — the spec it learned from the storage description (L3) versus the spec the type index suggests (legacy). The `people` partition exists in both (`/vault/resources/people/` and `/vault/wiki/people/`).
5. **`profile/card#me` is a `foaf:Person` with no name.** WebID is structurally valid (declares `solid:oidcIssuer`, `pim:storage`, `solid:publicTypeIndex`) but carries no `foaf:name` / `vcard:fn` / aliases.
6. **`wiki:contextDocument` resolves but `wiki:typeIndex` reference is via `urn:example:wiki#typeIndex` (not the standard `solid:publicTypeIndex` predicate).** The same mapping appears under both names — the WebID uses `solid:publicTypeIndex`, the storage description uses `wiki:typeIndex`. The two values agree, but two predicates for the same affordance is duplication.
7. **`urn:example:wiki#`** is an unresolvable URN namespace used pervasively (`wiki:Concept`, `wiki:Hub`, `wiki:WriteAffordance`, `wiki:governs`, …). It is declared in `void:vocabulary` but cannot be dereferenced, violating D49's "every vocabulary MUST be dereferenceable" intent. The context document at `/vault/meta/context.jsonld` does map the prefix but does not expose term definitions.
8. The vault root's `ldp:contains` includes both `meta/` (the L3 substrate metadata) and `wiki/` (the L3 typed resources), giving the agent multiple correct ways into the wiki-memory L3 surface.
