# HTTP Transcript — Pod Resource-Type Discovery

Target Pod: `http://pod.vardeman.me:3000/vault/`

---

## 1. GET Pod root

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**:
  - Pod root types: `pim:Storage`, `void:Dataset`, `dcat:DataService`.
  - `dc:conformsTo` → `fabric:CoreProfile`, `fabric:SolidPodProfile`.
  - `void:vocabulary` declares: SKOS, DCT, PROV, plus local `ontology/capability#` and `ontology/overlay#`.
  - `void:feature` → `fabric:LDPBrowse`.
  - Custom predicate: `<ontology/capability#catalog>` → `<meta/capabilities/>` (capability catalog pointer).
  - **Link headers** advertise: `rel="solid:storageDescription"` → `/vault/.well-known/solid`; `rel="describedby"` → `/vault/.meta`; `rel="timemap"` → `?ext=timemap`; `rel="timegate"` → self; `rel="...updatesViaStreamingHttp2023"` → notifications channel.
  - **Vary**: `accept-datetime` (Memento advertised per RFC 7089 §4.1.1).
  - `ldp:contains`: `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`.

---

## 2. GET storage description (advertised endpoint)

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/.well-known/solid`
- **Accept**: `text/turtle`
- **Status**: `501 Not Implemented`
- **Observations**:
  - **Surprise/inconsistency**: although the Pod root advertises `solid:storageDescription` → `/vault/.well-known/solid` (per D44), the server replies `NotImplementedHttpError: "Only supports descriptions of storage containers."`.
  - Substrate-level discovery falls back to the Pod-root description itself (which already carries the VoID + capability catalog pointer), and to the `/vault/meta/` container.

---

## 3. GET Pod root `.meta` (described-by)

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/.meta`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Same VoID/conformsTo/capability-catalog assertions as Pod root response — `.meta` is the persisted source; the root-GET turtle was projected from it.

---

## 4. GET capability catalog

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/capabilities/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: LDP BasicContainer titled "Substrate capability catalog". `ldp:contains` three capability descriptors:
  - `derived-view.ttl`
  - `markdown-content-projection.ttl`
  - `time-travel.ttl`
  - `sh:agentInstruction` on the container explains overlays reference these via `cap:requires`.

---

## 5–7. GET each capability descriptor

- **5. GET** `http://pod.vardeman.me:3000/vault/meta/capabilities/derived-view.ttl` (Accept: `text/turtle`) → `200 OK`. `cap:DerivedView` v1.0; substrate publishes affordance descriptors but does NOT execute SPARQL — agents must run queries client-side (Comunica recommended).
- **6. GET** `.../markdown-content-projection.ttl` (Accept: `text/turtle`) → `200 OK`. `cap:ContentProjection` v1.0; on `text/markdown` write, listener parses frontmatter + body wikilinks, projects triples into `.meta` per a `wiki:WriteAffordance` descriptor. Implements D58/D71/D81.
- **7. GET** `.../time-travel.ttl` (Accept: `text/turtle`) → `200 OK`. `cap:TimeTravel` v1.0; conforms to RFC 7089. `?ext=timemap` returns TimeMap, `?version=<14-digit>` returns Memento; Pattern 1.1 (OriginalResource doubles as TimeGate).

---

## 8. GET `/meta/` container

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Pod-level metadata root. `ldp:contains`: `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`.

---

## 9. GET JSON-LD context

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/context.jsonld`
- **Accept**: `application/ld+json`
- **Status**: `200 OK`
- **Observations**: Canonical prefix→IRI table. Declares `wiki:`, `cito:`, `foaf:`, plus short-form aliases for DCT/SKOS/CITO predicates. Class aliases: `Page`, `Concept`, `MOC`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub`. Property `maturity` → `wiki:maturity`.

---

## 10. GET SHACL shape catalog

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/shapes/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Container titled "SHACL Shape Catalog" with description "wiki-memory L3 SHACL shapes (D77)". `ldp:contains` five shape files: `page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl`.

---

## 11. GET affordance catalog

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/affordances/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Container titled "Affordance Catalog". `ldp:contains`: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`.

---

## 12–15. GET each affordance descriptor

- **12. GET** `.../meta/affordances/markdown-projection.ttl` (Accept: `text/turtle`) → `200 OK`. `wiki:WriteAffordance`; substrate governs predicates: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys: type, created, modified, maturity, aliases, identifier, citekey. Class-hint table → `../context.jsonld`. Installed by overlay `wiki-memory`.
- **13. GET** `.../meta/affordances/breadcrumb-view.ttl` → `200 OK`. `wiki:DerivedNavigationAffordance`; `skos:broader+` walk via client-side SELECT. Bind `?start` and run in own SPARQL engine.
- **14. GET** `.../meta/affordances/memento.ttl` → `200 OK`. `wiki:VersionAffordance`; conformsTo RFC 7089; restates `?ext=timemap` / `?version=<14-digit>` discovery.
- **15. GET** `.../meta/affordances/hub-view.ttl` → `200 OK`. `wiki:DerivedClassAffordance`; derives `wiki:Hub` from `wiki:Resource` with `wiki:threshold 3` (≥3 `skos:broader` inbound). Pod does NOT host a SPARQL endpoint.

---

## 16. GET `/settings/` container

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/settings/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: `ldp:contains`: `publicTypeIndex`.

---

## 17. GET Public Type Index

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: `solid:TypeIndex` + `solid:ListedDocument`. Five `solid:TypeRegistration` entries mapping classes to containers:
  - `wiki:Page` → `/vault/wiki/pages/`
  - `wiki:Source` → `/vault/wiki/sources/`
  - `wiki:Person` → `/vault/wiki/people/`
  - `wiki:Procedure` → `/vault/wiki/procedures/`
  - `wiki:WorkingNote` → `/vault/wiki/working/`

---

## 18. GET `/wiki/` container

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/wiki/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Titled "Wiki-memory L2 application root"; `wiki:installedBy` → `wiki-memory` overlay. `ldp:contains` five containers matching Type Index: `pages/`, `sources/`, `people/`, `procedures/`, `working/`. Consistent with D76 five-container layout.

---

## 19. GET `/ontology/` container

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/ontology/`
- **Accept**: `text/turtle`
- **Status**: `200 OK`
- **Observations**: Hosts local vocabulary stubs (D23 TBox cache pattern). Files: `vault-ontology.ttl`, `capability.ttl`, `overlay.ttl`, `wiki.ttl`, `solid-pod-profile.ttl`. Confirms `wiki:`, `cap:`, `overlay:` namespaces are dereferenceable on this Pod.

---

## 20. GET `wiki:PageShape`

- **Method/URL**: `GET http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl`
- **Accept**: default (server returns turtle)
- **Status**: `200 OK`
- **Observations**: `wiki:PageShape` targets `wiki:Page` (class-based dispatch per D78). Requires `dct:title`. `wiki:maturity` constrained to `wiki:draft | wiki:validated | wiki:core`. `sh:closed false` (open-world). `sh:agentInstruction` restates D81 Model A — substrate governs predicates listed in the markdown-projection affordance; agent edits body+frontmatter, not `.meta` directly.

---

## Summary observations

- 19 successful GETs, 1 unexpected `501` (the spec-mandated storage-description slot).
- Discovery converged on the five wiki-memory L3 resource classes via two independent paths (Type Index and Affordance Catalog).
- No 404s. No content-negotiation failures on the URLs actually advertised by previous responses.
