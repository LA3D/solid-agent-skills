# Pod Resource-Type Discovery Report

Target Pod: `http://pod.vardeman.me:3000/vault/`

---

## 1. Discovery path

I started at the Pod root and followed links (and `ldp:contains` enumerations) — never guessing URLs. Each row is one HTTP request; observations are short. Full HTTP detail is in `transcript.md`.

| # | Method · URL · Accept | Status | What I learned |
|---|---|---|---|
| 1 | `GET /vault/` · `text/turtle` | 200 | Pod root is `pim:Storage` + `void:Dataset` + `dcat:DataService`. Declares `void:vocabulary` (SKOS, DCT, PROV, local `capability#`, `overlay#`), `void:feature fabric:LDPBrowse`, custom `<capability#catalog>` → `/vault/meta/capabilities/`. Link headers advertise `solid:storageDescription` → `/vault/.well-known/solid`, `describedby` → `/vault/.meta`, Memento `timemap`/`timegate`, and a notifications channel. `Vary: accept-datetime`. `ldp:contains`: `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`. |
| 2 | `GET /vault/.well-known/solid` · `text/turtle` | **501** | **Surprise**: spec-mandated storage description endpoint replies `NotImplementedHttpError("Only supports descriptions of storage containers.")`. Fall back to the Pod-root `.meta` and `/vault/meta/`. |
| 3 | `GET /vault/.meta` · `text/turtle` | 200 | Same VoID + capability-catalog pointer the Pod root just returned — confirms the root description is projected from `.meta`. |
| 4 | `GET /vault/meta/capabilities/` · `text/turtle` | 200 | Substrate capability catalog. Three descriptors: `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl`. |
| 5 | `GET .../capabilities/derived-view.ttl` | 200 | `cap:DerivedView` v1.0 — Pod publishes derived-view affordances but **does not execute SPARQL**; agent runs CONSTRUCT/SELECT client-side. |
| 6 | `GET .../capabilities/markdown-content-projection.ttl` | 200 | `cap:ContentProjection` v1.0 — write-time listener on `text/markdown` projects frontmatter + body wikilinks into `.meta` per a `wiki:WriteAffordance` (D58/D71/D81). |
| 7 | `GET .../capabilities/time-travel.ttl` | 200 | `cap:TimeTravel` v1.0 — RFC 7089, Trellis query strings (`?ext=timemap`, `?version=<14-digit>`), Pattern 1.1 (OriginalResource = TimeGate). |
| 8 | `GET /vault/meta/` · `text/turtle` | 200 | Pod-level metadata root. `ldp:contains`: `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`. |
| 9 | `GET /vault/meta/context.jsonld` · `application/ld+json` | 200 | Canonical prefix→IRI table (`wiki:`, `cito:`, `foaf:`, DCT aliases). Class aliases for the five `wiki:*` types plus `Concept`, `MOC`, `Hub`. |
| 10 | `GET /vault/meta/shapes/` · `text/turtle` | 200 | "wiki-memory L3 SHACL shapes (D77)" — five shape files: `page`, `source`, `person`, `procedure`, `working`. |
| 11 | `GET /vault/meta/affordances/` · `text/turtle` | 200 | Four affordance descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`. |
| 12 | `GET .../affordances/markdown-projection.ttl` | 200 | `wiki:WriteAffordance` — substrate-governed predicates listed below (Section 4). Class-hint table → `context.jsonld`. |
| 13 | `GET .../affordances/breadcrumb-view.ttl` | 200 | `wiki:DerivedNavigationAffordance` — client-side `skos:broader+` SELECT walk. |
| 14 | `GET .../affordances/memento.ttl` | 200 | `wiki:VersionAffordance` — restates `?ext=timemap` / `?version=` discovery. |
| 15 | `GET .../affordances/hub-view.ttl` | 200 | `wiki:DerivedClassAffordance` — derives `wiki:Hub` when a `wiki:Resource` has ≥3 inbound `skos:broader`. |
| 16 | `GET /vault/settings/` · `text/turtle` | 200 | Contains `publicTypeIndex`. |
| 17 | `GET /vault/settings/publicTypeIndex` · `text/turtle` | 200 | `solid:TypeIndex` with five `solid:TypeRegistration` entries mapping `wiki:*` classes to `/wiki/<container>/`. |
| 18 | `GET /vault/wiki/` · `text/turtle` | 200 | "Wiki-memory L2 application root"; `wiki:installedBy` → overlay `wiki-memory`. Five sub-containers exactly matching the Type Index. |
| 19 | `GET /vault/ontology/` · `text/turtle` | 200 | Local vocabulary stubs: `wiki.ttl`, `capability.ttl`, `overlay.ttl`, `vault-ontology.ttl`, `solid-pod-profile.ttl` (D23 TBox cache). Confirms `wiki:`, `cap:`, `overlay:` are dereferenceable on this Pod. |
| 20 | `GET /vault/meta/shapes/page.shacl.ttl` | 200 | Spot-check: `wiki:PageShape` `sh:targetClass wiki:Page` (class-based dispatch, D78). Requires `dct:title`; `wiki:maturity` restricted to `draft | validated | core`. `sh:closed false`. |

---

## 2. Resource types supported

Source: cross-referenced Public Type Index (#17), wiki container listing (#18), and SHACL shape catalog (#10). Both routing surfaces agree.

| RDF class | Class IRI | Instance container |
|---|---|---|
| Page | `http://pod.vardeman.me:3000/vault/ontology/wiki#Page` | `http://pod.vardeman.me:3000/vault/wiki/pages/` |
| Source | `http://pod.vardeman.me:3000/vault/ontology/wiki#Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` |
| Person | `http://pod.vardeman.me:3000/vault/ontology/wiki#Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` |
| Procedure | `http://pod.vardeman.me:3000/vault/ontology/wiki#Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` |
| WorkingNote | `http://pod.vardeman.me:3000/vault/ontology/wiki#WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` |

Each class has a matching SHACL shape (`wiki:PageShape`, `wiki:SourceShape`, …) targeted by `sh:targetClass` (D78 class-based dispatch). Class-hint aliases `Concept`, `MOC`, and `Hub` appear in the JSON-LD context but have no dedicated container — `Concept`/`MOC` are flavors of `wiki:Page` (D77 flavor-within-shape), and `Hub` is a derived class produced by the hub-view affordance.

---

## 3. Vocabularies declared

From the Pod root `.meta` (`void:vocabulary`) and JSON-LD context (#9), augmented by the affordance descriptors that consume them:

| Prefix | Full IRI | Source |
|---|---|---|
| skos | `http://www.w3.org/2004/02/skos/core#` | `void:vocabulary` on Pod root |
| dct | `http://purl.org/dc/terms/` | `void:vocabulary` on Pod root |
| prov | `http://www.w3.org/ns/prov#` | `void:vocabulary` on Pod root |
| cap (local) | `http://pod.vardeman.me:3000/vault/ontology/capability#` | `void:vocabulary` on Pod root, local stub at `/vault/ontology/capability.ttl` |
| overlay (local) | `http://pod.vardeman.me:3000/vault/ontology/overlay#` | `void:vocabulary` on Pod root, local stub at `/vault/ontology/overlay.ttl` |
| wiki (local) | `http://pod.vardeman.me:3000/vault/ontology/wiki#` | JSON-LD context, Type Index, shape catalog, local stub at `/vault/ontology/wiki.ttl` |
| cito | `http://purl.org/spar/cito/` | JSON-LD context; predicates `cito:extends`, `cito:agreesWith`, `cito:disagreesWith` in the write-affordance |
| foaf | `http://xmlns.com/foaf/0.1/` | JSON-LD context |
| sh | `http://www.w3.org/ns/shacl#` | Shape catalog + affordance descriptors |
| ldp | `http://www.w3.org/ns/ldp#` | Container responses |
| solid | `http://www.w3.org/ns/solid/terms#` | Type Index + Link headers (`solid:storageDescription`, streaming notifications) |
| pim | `http://www.w3.org/ns/pim/space#` | Pod root type (`pim:Storage`) |
| void | `http://rdfs.org/ns/void#` | Pod root description |
| dcat | `http://www.w3.org/ns/dcat#` | Pod root type (`dcat:DataService`) |
| fabric | `https://w3id.org/cogitarelink/fabric#` | `dc:conformsTo` (`fabric:CoreProfile`, `fabric:SolidPodProfile`) and `void:feature fabric:LDPBrowse` |

The local `wiki:`, `cap:`, `overlay:` namespaces resolve to local stubs under `/vault/ontology/` — satisfying D49 "every declared vocab must be dereferenceable".

---

## 4. Substrate affordances advertised

Two layers: low-level **capabilities** (substrate primitives) at `/vault/meta/capabilities/` and high-level **affordances** (configured behaviors) at `/vault/meta/affordances/`. Affordances cite the capability they require via `wiki:requiresCapability`.

### Capabilities (substrate primitives)

| Capability | Type | Version | Implementation |
|---|---|---|---|
| Markdown content projection | `cap:ContentProjection` | 1.0 | `css/extensions/markdown-projection` |
| RFC 7089 Memento time-travel | `cap:TimeTravel` | 1.0 | `css/extensions/memento` |
| Derived view (descriptor-only) | `cap:DerivedView` | 1.0 | `urn:substrate:descriptor-publication-only` — agent executes SPARQL client-side |

### Affordances (write-time + query-view behaviors)

| Affordance | Class | Behavior |
|---|---|---|
| **Markdown projection listener** | `wiki:WriteAffordance` | On write of `text/markdown`, projects body wikilinks + frontmatter keys into the resource's `.meta`. Governs predicates: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Class-hint table at `meta/context.jsonld`. (D58/D71/D81 Model A — substrate owns these predicates; agent owns the rest.) |
| **Memento time-travel** | `wiki:VersionAffordance` | Every resource is versioned (RFC 7089 Pattern 1.1). `GET <R>?ext=timemap` → TimeMap; `GET <R>?version=<14-digit-datetime>` → specific Memento. Advertised via `Link rel="timemap"`/`rel="timegate"` and `Vary: accept-datetime` on every response. Tombstoned resources return 410 but their TimeMap still resolves. |
| **Hub derivation** | `wiki:DerivedClassAffordance` | Computes `wiki:Hub` membership for any `wiki:Resource` with ≥3 inbound `skos:broader` edges. Threshold = 3. Carries the CONSTRUCT query in `wiki:constructQuery`; agent must run it client-side (Pod is not a SPARQL endpoint). |
| **Breadcrumb chain** | `wiki:DerivedNavigationAffordance` | Walks `skos:broader+` from a given start IRI to the root. Carries the SELECT query in `wiki:selectQuery`; agent runs it client-side. |

Also advertised at the protocol layer but not in the affordance catalog: the Solid Notifications StreamingHTTP channel (Link header `rel="...solid/terms#updatesViaStreamingHttp2023"` on every resource) and LDP container browse (`void:feature fabric:LDPBrowse`).

---

## 5. Inconsistencies, 404s, and surprises

1. **Storage description endpoint returns 501.** The Pod root advertises `Link: <…/.well-known/solid>; rel="…solid:storageDescription"` (the D44 router slot), but `GET /vault/.well-known/solid` answers `501 NotImplementedHttpError("Only supports descriptions of storage containers.")`. An agent following the Link header alone (the canonical "follow your nose" path) gets stranded. Discovery succeeds only because (a) the Pod root response itself carries the VoID block + `<capability#catalog>` pointer, and (b) `/vault/meta/` is enumerable via the root's `ldp:contains` listing. This is the single biggest cold-start discovery gap on the Pod.
2. **No SPARQL endpoint, by design.** Both `derived-view.ttl` (capability) and `hub-view.ttl` (affordance) state explicitly "the Pod does not host a SPARQL endpoint" — derived views are descriptor-only. An agent that expects a `/sparql` route under the Pod will fail; it must bring its own engine (Comunica) and point at the wiki container roots.
3. **Affordance/Type Index agree, but reach the same five classes by different routes.** Type Index uses `solid:forClass`/`solid:instanceContainer`; the affordance catalog targets classes through `wiki:targetClass` and SHACL `sh:targetClass`. Both agree on `Page/Source/Person/Procedure/WorkingNote`. Consistency confirmed across both routing surfaces — no drift.
4. **`Concept`, `MOC`, `Hub` appear in JSON-LD context but have no Type Index registration.** `Concept` and `MOC` are flavors of `wiki:Page` distinguished by predicates (per D77 flavor-within-shape design); `Hub` is a derived class (per the hub-view affordance). Not an inconsistency — just worth noting an agent reading only the context might expect dedicated containers and not find them.
5. **No 404s** on any URL I fetched, because I only followed URLs that prior responses had advertised.
6. **`Allow` header on Pod root is `OPTIONS, HEAD, GET, POST`** — no PUT/PATCH/DELETE at the storage root, which is appropriate but worth noting for an agent attempting to create resources at the root.
