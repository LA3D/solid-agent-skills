# Pod Discovery Report — `http://pod.vardeman.me:3000/vault/`

## 1. Discovery Path

I started at the Pod root and followed Link headers + `ldp:contains` listings to fan out. The full sequence is in `transcript.md`. Summarized:

1. `GET /vault/` (Accept: text/turtle, 200) — root container. Returned RDF declaring `pim:Storage`, `void:vocabulary` set, `void:feature fabric:LDPBrowse`, `cap:catalog` pointer, and `ldp:contains` of five top-level containers. Link headers advertised `storageDescription`, `timemap`/`timegate`, and `describedby`.
2. `GET /vault/.well-known/solid` (Accept: text/turtle, **501 Not Implemented**) — the storage-description slot is wired in headers but the server refuses to serve it ("Only supports descriptions of storage containers."). The same information is accessible via `/vault/.meta` and the root listing itself, so the inconsistency is harmless in practice.
3. `GET /vault/.meta` (200) — confirms the VoID/DCAT/Fabric-profile metadata.
4. `GET /vault/meta/` (200) — Pod-level metadata container; lists `capabilities/`, `shapes/`, `affordances/`, and `context.jsonld`.
5. `GET /vault/meta/context.jsonld` (Accept: application/ld+json, 200) — canonical JSON-LD context document (prefix → IRI registry, short predicate aliases, class aliases).
6. `GET /vault/meta/affordances/` (200) → four substrate behaviors (see §4 below). I then `GET`d each (`markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`).
7. `GET /vault/meta/capabilities/` (200) — backing capability records that the affordances reference.
8. `GET /vault/meta/shapes/` (200) — five SHACL shape files (page/source/person/procedure/working).
9. `GET /vault/settings/` (200) → `publicTypeIndex`.
10. `GET /vault/settings/publicTypeIndex` (200) — five `solid:TypeRegistration` entries mapping each wiki class to its instance container. **This is the canonical answer for §2.**
11. `GET /vault/wiki/` (200) — confirmed the five subcontainers exist and are an `L2 application root` installed by `ontology/overlay#wiki-memory`.
12. `GET /vault/ontology/` and `GET /vault/ontology/wiki.ttl` (200) — definitions of the `wiki:` classes used by the Type Index, including class hierarchy and `wiki:Concept`/`wiki:MOC` Page subclasses, plus derived `wiki:Hub`.

## 2. Resource Types and Instance Containers

From `/vault/settings/publicTypeIndex` (the Solid Type Index — the authoritative class → container routing table):

| RDF class | Instance container |
|---|---|
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Page` | `http://pod.vardeman.me:3000/vault/wiki/pages/` |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` |

Additional types defined in `ontology/wiki.ttl` but **not** independently registered in the Type Index (they're subclasses or derived):

- `wiki:Resource` — abstract root.
- `wiki:Concept` — `rdfs:subClassOf wiki:Page, skos:Concept`. Instances live in `/wiki/pages/`.
- `wiki:MOC` (Map of Content) — `rdfs:subClassOf wiki:Page`. Instances live in `/wiki/pages/`.
- `wiki:Hub` — derived class; never asserted directly. Materialized by the `hub-view` CONSTRUCT affordance (≥3 incoming `skos:broader`).
- Lifecycle SKOS concepts: `wiki:draft`, `wiki:validated`, `wiki:core` (values of `wiki:maturity`).

`wiki:Person` is also a `foaf:Person`.

## 3. Declared Vocabularies (full IRIs)

The root listing (`/vault/` and `/vault/.meta`) declares the following via `void:vocabulary`:

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (Dublin Core Terms)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `http://pod.vardeman.me:3000/vault/ontology/capability#` (local capability vocabulary)
- `http://pod.vardeman.me:3000/vault/ontology/overlay#` (local overlay/installation vocabulary)

In addition, the JSON-LD context at `/vault/meta/context.jsonld` and the affordance descriptors actively use these vocabularies (declared as prefixes, though not all are listed under `void:vocabulary` on the root):

- `http://pod.vardeman.me:3000/vault/ontology/wiki#` (local wiki-memory L3 vocabulary)
- `http://purl.org/spar/cito/` (CiTO citation typing)
- `http://xmlns.com/foaf/0.1/` (FOAF)
- `http://www.w3.org/ns/ldp#` (LDP — used implicitly throughout)
- `http://www.w3.org/ns/solid/terms#` (Solid terms — Type Index, storageDescription, notifications)
- `http://www.w3.org/ns/shacl#` (SHACL — for `sh:agentInstruction` and shapes)
- `http://www.w3.org/ns/pim/space#` (PIM space — for `pim:Storage`)
- `http://rdfs.org/ns/void#` (VoID)
- `http://www.w3.org/ns/dcat#` (DCAT)

Pod also declares `dc:conformsTo`:

- `https://w3id.org/cogitarelink/fabric#CoreProfile`
- `https://w3id.org/cogitarelink/fabric#SolidPodProfile`

## 4. Substrate Affordances

The affordance catalog at `/vault/meta/affordances/` lists four substrate behaviors, each backed by a capability record at `/vault/meta/capabilities/`:

1. **`markdown-projection.ttl`** — `wiki:WriteAffordance` (write-time behavior).
   - The substrate listens for body+frontmatter changes on resources in the wiki containers and projects them into governed predicates on the `.meta` sidecar.
   - `wiki:governs`: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`.
   - `wiki:projectsFromFrontmatter`: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`.
   - Class-hint table: `/vault/meta/context.jsonld`.
   - Agent rule: edit body+frontmatter; do not PATCH `.meta` for governed predicates (D81 Model A).

2. **`memento.ttl`** — `wiki:VersionAffordance` (time-travel; conforms to RFC 7089).
   - Append `?ext=timemap` to any resource URL for its TimeMap.
   - Append `?version=<14-digit-datetime>` for a specific Memento.
   - Pattern 1.1: OriginalResource doubles as TimeGate. Link header on every resource advertises `rel="timemap"` and `rel="timegate"`.

3. **`hub-view.ttl`** — `wiki:DerivedClassAffordance` (query view, agent-side).
   - Derives `wiki:Hub` over `wiki:Resource` instances having ≥3 incoming `skos:broader` edges.
   - Comes with a `wiki:constructQuery` template; agent runs it in own SPARQL engine (Comunica recommended). **The Pod does not host a SPARQL endpoint.**

4. **`breadcrumb-view.ttl`** — `wiki:DerivedNavigationAffordance` (query view, agent-side).
   - Walks `skos:broader+` from a `?start` IRI to root ancestor.
   - Comes with a `wiki:selectQuery` template; run client-side.

Capability backing (at `/vault/meta/capabilities/`): `markdown-content-projection.ttl`, `time-travel.ttl`, `derived-view.ttl`.

## 5. Inconsistencies, 404s, and Surprises

- **`GET /vault/.well-known/solid` → 501 Not Implemented.** The Link header on the root advertises this URL as the `solid:storageDescription`, but CSS refuses with "Only supports descriptions of storage containers." This is the most concrete inconsistency. The functional storage-description content (vocab declarations, capability catalog pointer, conformance profiles) is instead reachable at `/vault/` itself and `/vault/.meta`. Per the project's D44, the storage description was meant to live at this slot — the implementation gap appears to be in CSS's storage-description handler.
- **No SPARQL endpoint.** The Pod is honest about this: the `hub-view` affordance explicitly states "The Pod does not host a SPARQL endpoint" and instructs the agent to run CONSTRUCT/SELECT in its own engine. This matches D3 (Comunica sidecar as client-side SPARQL).
- **`wiki:Concept` and `wiki:MOC` are not in the Type Index.** They're declared as `Page` subclasses in `wiki.ttl` and exposed as aliases in `context.jsonld`, but the Type Index only registers the five container-root classes. Agents looking up where `wiki:Concept` instances live must follow `rdfs:subClassOf` reasoning to route through `wiki:Page → /wiki/pages/`. (This is consistent with D78's class-based shape targeting, but a cold agent would not know without reading the ontology.)
- **Vocabulary list under `void:vocabulary` is incomplete.** The root declares SKOS, DCT, PROV, capability, overlay — but the affordance descriptors and shapes also use CITO, FOAF, SHACL, and the local wiki vocab. D49 calls for `void:vocabulary` to declare *every* RDF vocab used; the current root falls short of that.
- **Capability backing files declared but not fetched in this run.** The capability records at `/vault/meta/capabilities/*.ttl` (`derived-view`, `markdown-content-projection`, `time-travel`) are referenced from affordance descriptors via `wiki:requiresCapability` but were only enumerated, not dereferenced. They are reachable.
- **`/vault/profile/` was listed at the root but not explored.** Mentioned for completeness — it likely holds the WebID profile (D14), but it was not in the discovery path needed to answer the resource-types question.
- **`wiki:Hub` cannot be discovered by reading any resource.** It's a derived class — instances exist only as a CONSTRUCT result computed by the agent. An agent that doesn't run the hub-view CONSTRUCT will never see a `wiki:Hub` typed triple in any `.meta`.
