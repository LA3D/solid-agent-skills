# Pod Resource-Type Discovery — `http://pod.vardeman.me:3000/vault/`

## 1. Discovery path

Standard Solid Protocol discovery walk:

| Step | Method · URL · Accept | Status | What it taught me |
|---|---|---|---|
| 1 | `HEAD /vault/` · `text/turtle` | 200 | This is a `pim:Storage` (Pod root) and `ldp:BasicContainer`. Link headers advertise: `storageDescription` → `/vault/.well-known/solid`; Memento `timemap` (`?ext=timemap`) + `timegate` (the resource itself, RFC 7089 Pattern 1.1); `Vary: accept-datetime`; `describedby` → `/vault/.meta`; streaming notifications channel. |
| 2 | `GET /vault/.well-known/solid` · `text/turtle` | 200 | Storage description acts as a router. Declares `void:vocabulary` (six vocabs), `void:feature fabric:LDPBrowse`, and points to context (`wiki:contextDocument`), shape catalog (`wiki:shapeCatalog`), affordance catalog (`wiki:affordanceCatalog`), Type Index (`wiki:typeIndex`), and five wiki containers via `rdfs:seeAlso`. Conforms to `fabric:CoreProfile`, `fabric:SolidPodProfile`, and `wiki:L3Profile`. |
| 3 | `GET /vault/settings/publicTypeIndex` · `text/turtle` | 200 | Five `solid:TypeRegistration` entries map RDF classes to `solid:instanceContainer` paths under `/vault/resources/*` and `/vault/projects/`. |
| 4 | `GET /vault/meta/affordances/` · `text/turtle` | 200 | Container lists four descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`. |
| 5 | `GET /vault/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` · `text/turtle` | 200×4 | Each describes a substrate capability (write-time projection, derived navigation, time-travel, derived class). |
| 6 | `GET /vault/meta/shapes/` · `text/turtle` | 200 | Container exists but its `ldp:contains` list is empty. |
| 7 | `GET /vault/meta/context.jsonld` · `application/ld+json` | 200 | JSON-LD context with prefix table and class-hint mappings (`Concept→wiki:Concept`, `Source→wiki:Source`, `Person→wiki:Person`, `Procedure→wiki:Procedure`, `WorkingNote→wiki:WorkingNote`, `Hub→wiki:Hub`, etc.). |
| 8 | `HEAD /vault/meta/shapes/{page,source,person,procedure,working}.shacl.ttl` | 404×5 | Shapes referenced by the storage description and per-container `wiki:shape` links **do not resolve**. |
| 9 | `GET /vault/wiki/{pages,sources,people,procedures,working}/` · `text/turtle` | 200×5 | Each container's `.meta` carries `wiki:shape` (pointing at the missing shape file) and `sh:agentInstruction` describing what the container is for and which predicates to use. |
| 10 | `HEAD /vault/resources/{concepts,theories,literature,methods}/`, `/vault/projects/`, `/vault/resources/` | 200×6 | Legacy Type-Index targets all exist. |
| 11 | `GET /vault/.meta` · `text/turtle` | 200 | Root container's `ldp:contains` enumerates 10 children: `resources/, ontology/, wiki/, settings/, areas/, procedures/, profile/, projects/, archive/, meta/`. |

## 2. Resource types

The Pod advertises **two parallel type surfaces** that have not been reconciled.

### Solid Type Index (`/vault/settings/publicTypeIndex`)

| `solid:forClass` | `solid:instanceContainer` |
|---|---|
| `skos:Concept` | `http://pod.vardeman.me:3000/vault/resources/concepts/` |
| `vault:TheoryNote` (`https://pod.vardeman.me/vault/ontology#TheoryNote`) | `http://pod.vardeman.me:3000/vault/resources/theories/` |
| `vault:LiteratureNote` | `http://pod.vardeman.me:3000/vault/resources/literature/` |
| `vault:MethodNote` | `http://pod.vardeman.me:3000/vault/resources/methods/` |
| `vault:Project` | `http://pod.vardeman.me:3000/vault/projects/` |

### Wiki-memory L3 surface (storage description `rdfs:seeAlso` + per-container `.meta`)

| Container | Shape | Implicit class (per `meta/context.jsonld`) | Agent instruction (abridged) |
|---|---|---|---|
| `http://pod.vardeman.me:3000/vault/wiki/pages/` | `wiki:PageShape` | `wiki:Concept` (general wiki content / Hub / MOC / theory / daily) | "General wiki content. Use `dct:title`, `skos:broader` for parent, `skos:related` for lateral." |
| `http://pod.vardeman.me:3000/vault/wiki/sources/` | `wiki:SourceShape` | `wiki:Source` | "Citation records. `dct:identifier` required (DOI / arXiv / citekey). Use `cito:extends/agreesWith/disagreesWith`." |
| `http://pod.vardeman.me:3000/vault/wiki/people/` | `wiki:PersonShape` | `wiki:Person` | "FOAF-based. `foaf:nick` carries aliases / citekey patterns." |
| `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `wiki:ProcedureShape` | `wiki:Procedure` | "Procedural memory. `sh:agentInstruction` on `.meta` carries the procedure body." |
| `http://pod.vardeman.me:3000/vault/wiki/working/` | `wiki:WorkingMemoryShape` | `wiki:WorkingNote` | "Low-ceremony working memory. Permissive shape. Promote with `mem:Crystallize`." |

In addition, `wiki:Hub` is a **derived class** materialized by the hub-view affordance (no instance container — it is computed in-memory via SPARQL CONSTRUCT).

## 3. Vocabularies declared by the Pod

From `void:vocabulary` in the storage description:

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (Dublin Core Terms)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `https://pod.vardeman.me/vault/ontology#` (local `vault:` ontology — `TheoryNote`, `LiteratureNote`, `MethodNote`, `Project`)
- `urn:example:wiki#` (local `wiki:` namespace — `L3Profile`, `Resource`, `Concept`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub`, `maturity`, `governs`, `shape`, …)
- `http://purl.org/spar/cito/` (CiTO)

Additional vocabularies referenced in served documents (not in `void:vocabulary` but used in `.meta` / context / affordance descriptors):

- `http://xmlns.com/foaf/0.1/` (FOAF — declared in `meta/context.jsonld`)
- `http://www.w3.org/ns/ldp#` (LDP — required by protocol)
- `http://www.w3.org/ns/shacl#` (SHACL — `sh:agentInstruction`)
- `http://www.w3.org/ns/pim/space#` (`pim:Storage`, `pim:Workspace`)
- `http://www.w3.org/ns/solid/terms#` (Solid Type Index, storage description, notifications)
- `http://rdfs.org/ns/void#` and `http://www.w3.org/ns/dcat#` (storage description typing)
- `https://w3id.org/cogitarelink/fabric#` (`CoreProfile`, `SolidPodProfile`, `LDPBrowse`)

## 4. Substrate affordances (write-time + read-time capabilities)

From `/vault/meta/affordances/`:

| Affordance | Type | Capability |
|---|---|---|
| `markdown-projection.ttl` | `wiki:WriteAffordance` | **Write-time projection listener.** When body markdown / frontmatter is written, the substrate authoritatively writes a fixed set of predicates into `.meta`. `wiki:governs` lists them: `rdf:type, dct:title, dct:identifier, dct:created, dct:modified, dct:references, dct:subject, dct:contributor, dct:creator, skos:broader, skos:related, cito:extends, cito:agreesWith, cito:disagreesWith, wiki:maturity, prov:wasGeneratedBy`. `wiki:projectsFromFrontmatter` lists which YAML keys it reads (`type, created, modified, maturity, aliases, identifier, citekey`). Agents must edit body+frontmatter (not PATCH `.meta`) for governed predicates; all other predicates are agent-extensible. Class-hint table lives at `/vault/meta/context.jsonld`. |
| `memento.ttl` | `wiki:VersionAffordance` | **Time-travel (RFC 7089).** Append `?ext=timemap` to any resource URL for its TimeMap; append `?version=<14-digit-datetime>` for a specific Memento. Pattern 1.1: the OriginalResource doubles as the TimeGate (advertised via `rel="timegate"` Link header + `Vary: accept-datetime`). |
| `breadcrumb-view.ttl` | `wiki:DerivedNavigationAffordance` | **Query view.** Walks `skos:broader+` to the root from a starting URI. Invoked at `/sparql` with `<START>` substitution. Returns ordered breadcrumb trail. |
| `hub-view.ttl` | `wiki:DerivedClassAffordance` | **Derived class (query view).** Materializes `wiki:Hub` for any `wiki:Resource` with ≥3 distinct incoming `skos:broader` references. Threshold `3` declared via `wiki:threshold`. CONSTRUCT runs against `/sparql`. |

Protocol-level affordances from headers (not in catalog):

- **Streaming notifications**: `Link: rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"` → `/.notifications/StreamingHTTPChannel2023/...` per resource.
- **WAC**: `WAC-Allow` exposed in CORS.
- **LDP write methods**: `Allow: OPTIONS, HEAD, GET, POST` on the container; `Accept-Post: */*`.

## 5. Inconsistencies / 404s / surprises

1. **The shape catalog is broken.** `/vault/meta/shapes/` is a valid LDP container (200 OK) but its `ldp:contains` is empty. Every shape file referenced by the per-container `wiki:shape` predicate — `page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl` — returns **404**. Agents that want to validate writes against the advertised wiki-memory L3 shapes cannot resolve them. The storage description's `wiki:shapeCatalog` and every container's `wiki:shape` link are dangling.
2. **Two parallel type registries.** The Solid Type Index (`/vault/settings/publicTypeIndex`) registers a *legacy* type set (`skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) under `/vault/resources/*` and `/vault/projects/`. The storage description's `rdfs:seeAlso` advertises a *new* L3 surface (`/vault/wiki/{pages,sources,people,procedures,working}/`). Neither set references the other. An agent that follows the Type Index will never see the wiki containers, and vice versa.
3. **Undeclared top-level containers.** Root `.meta` enumerates 10 children: `resources/, ontology/, wiki/, settings/, areas/, procedures/, profile/, projects/, archive/, meta/`. Of these, `areas/`, `archive/`, `ontology/`, top-level `procedures/` (separate from `wiki/procedures/`), and `profile/` are not declared in either the Type Index or the L3 `seeAlso` list. They exist but their resource types are undocumented through the standard discovery affordances.
4. **`urn:example:wiki#` is a placeholder namespace.** The Pod's primary L3 vocabulary uses `urn:example:wiki#` — a non-dereferenceable URN — even though the storage description declares it under `void:vocabulary` (which per D49 should be dereferenceable). The placeholder is acknowledged as deferred minting (per D79 in upstream design), but it does mean the substrate's own classes (`wiki:Concept`, `wiki:Source`, etc.) cannot be resolved by following their IRIs.
5. **Two `procedures/` containers.** `/vault/procedures/` (top-level, undocumented) and `/vault/wiki/procedures/` (L3, has `wiki:ProcedureShape`). It is unclear from the served metadata which is canonical for procedural memory.
6. **Memento + notifications are advertised on every container** — including discovery resources. The `?ext=timemap` and streaming channel apply uniformly across the Pod.

## Summary

The Pod exposes a wiki-memory **L3 reference profile**: five typed containers (`wiki/pages`, `sources`, `people`, `procedures`, `working`) + one derived class (`wiki:Hub`), governed by a write-time `MarkdownProjectionListener` over 16 predicates and equipped with RFC 7089 Memento time-travel and two SPARQL-based derived views (breadcrumb, hub). It also retains a **legacy resource surface** via Type Index (`resources/concepts`, `theories`, `literature`, `methods`, `projects/`). Shape resources are advertised but not served — the largest gap.
