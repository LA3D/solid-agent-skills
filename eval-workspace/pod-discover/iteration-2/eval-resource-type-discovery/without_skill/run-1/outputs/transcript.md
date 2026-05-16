# HTTP Request Transcript — Pod Resource Type Discovery

## Requests

1. `GET http://pod.vardeman.me:3000/vault/` — `Accept: text/turtle` → **200 OK**
   - Pod root container.
   - `Link: <.../.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"`
   - `Link: <.../vault/.meta>; rel="describedby"`
   - `Link: <.../?ext=timemap>; rel="timemap"`, `<.../>; rel="timegate"` (Memento)
   - Body declares root as `pim:Storage, void:Dataset, dcat:DataService`, conforms to `fabric:CoreProfile` and `fabric:SolidPodProfile`, declares `void:vocabulary` for SKOS, DCT, PROV, plus pod-local `ontology/capability#` and `ontology/overlay#`. Advertises `void:feature fabric:LDPBrowse` and `capability:catalog meta/capabilities/`. `ldp:contains` lists five top-level containers: `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`.

2. `GET http://pod.vardeman.me:3000/vault/.well-known/solid` — `Accept: text/turtle` → **501 Not Implemented**
   - Surprise: CSS storage description endpoint advertised in the Link header is not implemented (`Only supports descriptions of storage containers.`).

3. `GET http://pod.vardeman.me:3000/vault/.well-known/solid` — `Accept: application/ld+json` → **501 Not Implemented**
   - Same error in JSON-LD form. Confirms it is genuinely not implemented, not a content-negotiation issue.

4. `GET http://pod.vardeman.me:3000/vault/.meta` — `Accept: text/turtle` → **200 OK**
   - Root `.meta` resource (description resource). Confirms the same root-graph triples as request 1, including `<../ontology/capability#catalog> <meta/capabilities/>` — the substrate capability catalog pointer.

5. `GET http://pod.vardeman.me:3000/vault/meta/` — `Accept: text/turtle` → **200 OK**
   - Pod-level metadata container. `ldp:contains` lists: `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`.

6. `GET http://pod.vardeman.me:3000/vault/meta/capabilities/` — `Accept: text/turtle` → **200 OK**
   - "Substrate capability catalog" with `sh:agentInstruction`. Three capability descriptors: `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl`.

7. `GET http://pod.vardeman.me:3000/vault/meta/affordances/` — `Accept: text/turtle` → **200 OK**
   - "Affordance Catalog — Discoverable L3 capabilities of this Pod." Four affordance descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`.

8. `GET http://pod.vardeman.me:3000/vault/meta/shapes/` — `Accept: text/turtle` → **200 OK**
   - "SHACL Shape Catalog. wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working." Files: `page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl`.

9. `GET http://pod.vardeman.me:3000/vault/meta/context.jsonld` → **200 OK**
   - Canonical JSON-LD context. Declares prefixes for `wiki:`, `cito:`, `foaf:`, and aliases short terms (`title`, `references`, `broader`, `related`, `contributor`, `creator`, `extends`, `supports`, `criticizes`) to their full IRIs. Declares wiki types: `Page`, `Concept`, `MOC`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub`, plus `maturity`.

10. `GET http://pod.vardeman.me:3000/vault/wiki/` — `Accept: text/turtle` → **200 OK**
    - "Wiki-memory L2 application root." Five typed containers: `pages/`, `procedures/`, `working/`, `sources/`, `people/`. Installed by `<../ontology/overlay#wiki-memory>`.

11. `GET http://pod.vardeman.me:3000/vault/settings/` — `Accept: text/turtle` → **200 OK**
    - Contains `publicTypeIndex`.

12. `GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex` — `Accept: text/turtle` → **200 OK**
    - Solid Type Index with five `solid:TypeRegistration` entries: `wiki:Page` → `wiki/pages/`, `wiki:Source` → `wiki/sources/`, `wiki:Person` → `wiki/people/`, `wiki:Procedure` → `wiki/procedures/`, `wiki:WorkingNote` → `wiki/working/`.

13. `GET http://pod.vardeman.me:3000/vault/profile/` — `Accept: text/turtle` → **200 OK**
    - WebID profile container. Contains `card`.

14. `GET http://pod.vardeman.me:3000/vault/ontology/` — `Accept: text/turtle` → **200 OK**
    - Vocabulary container. Files: `vault-ontology.ttl`, `capability.ttl`, `overlay.ttl`, `wiki.ttl`, `solid-pod-profile.ttl`.

15. `GET http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl` → **200 OK**
    - `wiki:WriteAffordance`. Governs predicates: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Projects from frontmatter keys: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Requires capability `markdown-content-projection.ttl`.

16. `GET http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl` → **200 OK**
    - `wiki:DerivedNavigationAffordance`. SPARQL SELECT walking `skos:broader+` chain to the root. Requires capability `derived-view.ttl`. Agent must run client-side (Comunica).

17. `GET http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl` → **200 OK**
    - `wiki:VersionAffordance`. RFC 7089 conformance. Use `?ext=timemap` for TimeMap, `?version=<14-digit-datetime>` for a Memento. Pattern 1.1 (OriginalResource = TimeGate).

18. `GET http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl` → **200 OK**
    - `wiki:DerivedClassAffordance` — derives `wiki:Hub` from `wiki:Resource` with `≥3` incoming `skos:broader`. SPARQL CONSTRUCT for client-side execution. Threshold: 3.

19. `GET http://pod.vardeman.me:3000/vault/wiki/pages/` — `Accept: text/turtle` → **200 OK**
    - Container metadata via `.meta`. `solid:forClass wiki:Page`. `wiki:shape <../../meta/shapes/page.shacl.ttl>`. `sh:agentInstruction` describes Page semantics (wiki:Page or subclass wiki:Concept/wiki:MOC). Container is empty (no `ldp:contains` entries shown).

20. `GET http://pod.vardeman.me:3000/vault/wiki/sources/` — `Accept: text/turtle` → **200 OK**
    - `solid:forClass wiki:Source`. Shape: `source.shacl.ttl`. `dct:identifier` required. Cito predicates for typed citations. Empty.

21. `GET http://pod.vardeman.me:3000/vault/wiki/people/` — `Accept: text/turtle` → **200 OK**
    - `solid:forClass wiki:Person`. Shape: `person.shacl.ttl`. FOAF-based. Empty.

22. `GET http://pod.vardeman.me:3000/vault/wiki/procedures/` — `Accept: text/turtle` → **200 OK**
    - `solid:forClass wiki:Procedure`. Shape: `procedure.shacl.ttl`. Body markdown is the procedure body. Empty.

23. `GET http://pod.vardeman.me:3000/vault/wiki/working/` — `Accept: text/turtle` → **200 OK**
    - `solid:forClass wiki:WorkingNote`. Shape: `working.shacl.ttl`. Permissive working memory (D73). Empty.

24. `GET http://pod.vardeman.me:3000/vault/ontology/wiki.ttl` → **200 OK**
    - Wiki ontology RDFS. Class hierarchy: `wiki:Resource` (abstract root); subclasses `wiki:Page`, `wiki:Source`, `wiki:Person` (also `foaf:Person`), `wiki:Procedure`, `wiki:WorkingNote`. `wiki:Page` further subclasses: `wiki:Concept` (also `skos:Concept`), `wiki:MOC`. Derived: `wiki:Hub`. Lifecycle: `wiki:maturity` with `wiki:draft`/`wiki:validated`/`wiki:core` SKOS concepts.

25. `GET http://pod.vardeman.me:3000/vault/ontology/overlay.ttl` → **200 OK**
    - Overlay vocabulary. `overlay:Overlay`, installable application bundles that declare vocabularies, require capabilities, install containers/shapes/affordances/type-registrations.

26. `GET http://pod.vardeman.me:3000/vault/meta/capabilities/markdown-content-projection.ttl` → **200 OK**
    - `cap:ContentProjection` v1.0 for `text/markdown`. Implemented by `css/extensions/markdown-projection`. Configuration shape: `wiki:WriteAffordance`. Substrate fires on every write of a markdown body to a container whose `.meta` points at such an affordance descriptor (D58/D71/D81).

27. `GET http://pod.vardeman.me:3000/vault/meta/capabilities/derived-view.ttl` → **200 OK**
    - `cap:DerivedView` v1.0. **Important:** Pod publishes CONSTRUCT/SELECT descriptors but **does not execute them server-side**. Agent must bring its own SPARQL engine (Comunica recommended).

28. `GET http://pod.vardeman.me:3000/vault/meta/capabilities/time-travel.ttl` → **200 OK**
    - `cap:TimeTravel` v1.0. RFC 7089 Memento. Implemented by `css/extensions/memento`. Every resource is versioned. Tombstones return 410 Gone on plain GET but their TimeMap still resolves.

## Observations

- The advertised `.well-known/solid` storage description (linked from every response) is **not implemented**. The substrate vocabulary declarations actually live in the root container's `.meta` graph (request 1/4).
- The Pod cleanly separates **L1 substrate primitives** (capabilities at `meta/capabilities/`) from **L3 application bindings** (affordances at `meta/affordances/`). Affordances reference the primitives they need via `wiki:requiresCapability`.
- **Two routing mechanisms agree**: Solid Type Index at `settings/publicTypeIndex` (class → container) and per-container `.meta` declarations (`solid:forClass`, `wiki:shape`, `sh:agentInstruction`). Both list the same five containers/classes.
- **Derived views are not executed server-side.** The Pod publishes SPARQL templates and expects the agent to run them.
- All five wiki containers are currently **empty** (no `ldp:contains` instance entries). The Pod is configured but un-populated.
