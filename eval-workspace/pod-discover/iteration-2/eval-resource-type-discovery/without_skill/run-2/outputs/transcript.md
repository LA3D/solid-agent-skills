# Discovery Transcript

## HTTP Requests

1. **GET** `http://pod.vardeman.me:3000/vault/`
   - Accept: `text/turtle`
   - Status: **200 OK**

2. **GET** `http://pod.vardeman.me:3000/vault/.well-known/solid`
   - Accept: `text/turtle`
   - Status: **501 Not Implemented** ("Only supports descriptions of storage containers.")

3. **GET** `http://pod.vardeman.me:3000/vault/.meta`
   - Accept: `text/turtle`
   - Status: **200 OK**

4. **GET** `http://pod.vardeman.me:3000/vault/meta/`
   - Accept: `text/turtle`
   - Status: **200 OK**

5. **GET** `http://pod.vardeman.me:3000/vault/meta/context.jsonld`
   - Accept: `application/ld+json`
   - Status: **200 OK**

6. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/`
   - Accept: `text/turtle`
   - Status: **200 OK**

7. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl`
   - Accept: `text/turtle`
   - Status: **200 OK**

8. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl`
   - Accept: `text/turtle`
   - Status: **200 OK**

9. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl`
   - Accept: `text/turtle`
   - Status: **200 OK**

10. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl`
    - Accept: `text/turtle`
    - Status: **200 OK**

11. **GET** `http://pod.vardeman.me:3000/vault/meta/capabilities/`
    - Accept: `text/turtle`
    - Status: **200 OK**

12. **GET** `http://pod.vardeman.me:3000/vault/meta/shapes/`
    - Accept: `text/turtle`
    - Status: **200 OK**

13. **GET** `http://pod.vardeman.me:3000/vault/settings/`
    - Accept: `text/turtle`
    - Status: **200 OK**

14. **GET** `http://pod.vardeman.me:3000/vault/settings/publicTypeIndex`
    - Accept: `text/turtle`
    - Status: **200 OK**

15. **GET** `http://pod.vardeman.me:3000/vault/wiki/`
    - Accept: `text/turtle`
    - Status: **200 OK**

16. **GET** `http://pod.vardeman.me:3000/vault/ontology/`
    - Accept: `text/turtle`
    - Status: **200 OK**

17. **GET** `http://pod.vardeman.me:3000/vault/ontology/wiki.ttl`
    - Accept: `text/turtle`
    - Status: **200 OK**

## Observations

1. **Root vault container** — Returned VoID/DCAT-style RDF identifying root as `pim:Storage`, `void:Dataset`, `dcat:DataService`. Declared `dc:conformsTo` `fabric:CoreProfile`, `fabric:SolidPodProfile`. Listed `void:vocabulary` set (SKOS, DCT, PROV, capability, overlay). Advertised feature `fabric:LDPBrowse`, pointed to capability catalog at `meta/capabilities/`. `Link` headers advertise `storageDescription` → `.well-known/solid`, Memento `timemap`/`timegate`, `describedby` → `.meta`. `ldp:contains`: `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`.

2. **.well-known/solid storage description** — 501 Not Implemented. Surprise: CSS refused to serve a storage description for the root, error saying it "only supports descriptions of storage containers." But the root IS the storage container (advertises `pim:Storage`). The vocab/feature/catalog declarations are nonetheless present at `vault/` itself and `vault/.meta`, so they fill the storage-description slot in practice.

3. **vault/.meta** — Same content as root listing but as the dedicated description resource. Confirmed `void:vocabulary` set and `cap:catalog` pointer.

4. **/meta/** — "Pod-level metadata" container. Contains four entries: `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`.

5. **context.jsonld** — JSON-LD context registry. Maps short names → IRIs: `wiki`, `cito`, `foaf` prefixes; predicate aliases like `references → dct:references`, `broader → skos:broader`, `extends → cito:extends`, `supports → cito:agreesWith`, `criticizes → cito:disagreesWith`; class aliases `Page`, `Concept`, `MOC`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub` (all under `wiki:`).

6. **affordances/** — "Affordance Catalog — Discoverable L3 capabilities of this Pod." Four descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`.

7. **markdown-projection.ttl** — `wiki:WriteAffordance`. Lists `wiki:governs` predicates (rdf:type, dct:title/identifier/created/modified/references/subject/contributor/creator, skos:broader/related, cito:extends/agreesWith/disagreesWith, wiki:maturity, prov:wasGeneratedBy). `wiki:projectsFromFrontmatter`: type, created, modified, maturity, aliases, identifier, citekey. Substrate writes those predicates from body+frontmatter; agent should not PATCH .meta directly for governed predicates.

8. **breadcrumb-view.ttl** — `wiki:DerivedNavigationAffordance`. Provides a SELECT query template walking `skos:broader+` to the root. Agent runs against own SPARQL engine pointed at Pod containers.

9. **memento.ttl** — `wiki:VersionAffordance`. RFC 7089 time-travel. `?ext=timemap` for TimeMap; `?version=<14-digit-datetime>` for specific Memento. Pattern 1.1 — OriginalResource doubles as TimeGate.

10. **hub-view.ttl** — `wiki:DerivedClassAffordance`. Derives `wiki:Hub` over `wiki:Resource` when ≥3 instances point at it via `skos:broader`. Includes CONSTRUCT template. Note: "The Pod does not host a SPARQL endpoint" — agent runs query in own engine.

11. **capabilities/** — "Substrate capability catalog." Contains `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl`. These are referenced from affordance descriptors via `wiki:requiresCapability`.

12. **shapes/** — "wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working." Contains five `.shacl.ttl` files matching D77 catalog.

13. **settings/** — Holds `publicTypeIndex` (one file).

14. **publicTypeIndex** — Solid Type Index. Five `solid:TypeRegistration` entries mapping classes to instance containers: `wiki:Page → /wiki/pages/`, `wiki:Source → /wiki/sources/`, `wiki:Person → /wiki/people/`, `wiki:Procedure → /wiki/procedures/`, `wiki:WorkingNote → /wiki/working/`.

15. **wiki/** — "Wiki-memory L2 application root." `wiki:installedBy <ontology/overlay#wiki-memory>`. Contains five subcontainers: `pages/`, `sources/`, `people/`, `procedures/`, `working/` — matches Type Index.

16. **ontology/** — Vocabulary definitions: `vault-ontology.ttl`, `capability.ttl`, `overlay.ttl`, `wiki.ttl`, `solid-pod-profile.ttl`.

17. **wiki.ttl** — Class hierarchy. Root `wiki:Resource`. Per-container base classes: `wiki:Page`, `wiki:Source`, `wiki:Person` (also `foaf:Person`), `wiki:Procedure`, `wiki:WorkingNote`. `wiki:Page` subclasses: `wiki:Concept` (also `skos:Concept`), `wiki:MOC`. Derived class: `wiki:Hub` (substrate-computed, never asserted). Lifecycle: `wiki:maturity` with values `wiki:draft`, `wiki:validated`, `wiki:core` (all skos:Concept).
