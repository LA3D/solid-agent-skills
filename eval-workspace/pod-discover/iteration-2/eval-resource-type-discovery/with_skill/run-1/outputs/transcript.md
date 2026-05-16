# Discovery Transcript — `http://pod.vardeman.me:3000/vault/`

Each step starts from a URL that was discovered in a prior response. No path was guessed.

## HTTP requests

1. **HEAD** `http://pod.vardeman.me:3000/vault/` — (no Accept) — **200 OK**
   - Observed `Link` headers: `describedby` → `/vault/.meta`; `timemap` → `/vault/?ext=timemap`; `timegate` → `/vault/`; `storageDescription` (rel `http://www.w3.org/ns/solid/terms#storageDescription`) → `/vault/.well-known/solid`.

2. **GET** `http://pod.vardeman.me:3000/vault/.well-known/solid` — `Accept: text/turtle` — **501 Not Implemented**
   - Body: `dct:title "NotImplementedHttpError"; dct:description "Only supports descriptions of storage containers."`. The spec-mandated storage-description slot (D44) is advertised in the Link header but the endpoint itself refuses to serve a description here.

3. **GET** `http://pod.vardeman.me:3000/vault/.meta` — `Accept: text/turtle` — **200 OK**
   - The `.meta` for `/vault/` IS the storage description in practice. It declares the parent `<../>` (= `/vault/`) as `pim:Storage`, `void:Dataset`, `dcat:DataService`; `dct:conformsTo` fabric `CoreProfile` + `SolidPodProfile`; `void:vocabulary` listing SKOS, DCT, PROV, plus two relative IRIs `<ontology/capability#>` and `<ontology/overlay#>`; `void:feature` fabric `LDPBrowse`; and `cap:catalog` → `/vault/meta/capabilities/`. `ldp:contains` shows top-level children `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`.

4. **GET** `http://pod.vardeman.me:3000/.well-known/solid` — `Accept: text/turtle` — **501** (same `NotImplementedHttpError`; root-level storage description not available either).

5. **GET** `http://pod.vardeman.me:3000/vault/meta/capabilities/` — `Accept: text/turtle` — **200 OK**
   - LDP container listing three capability descriptors: `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl`. Container `sh:agentInstruction` describes capabilities as `cap:Capability` instances referenced from overlay manifests' `cap:requires`.

6. **GET** `http://pod.vardeman.me:3000/vault/wiki/` — `Accept: text/turtle` — **200 OK**
   - Container titled "Wiki-memory L2 application root" installed by `<../ontology/overlay#wiki-memory>`. `ldp:contains` lists exactly five sub-containers: `pages/`, `procedures/`, `working/`, `sources/`, `people/`.

7. **GET** `http://pod.vardeman.me:3000/vault/meta/` — `Accept: text/turtle` — **200 OK**
   - `ldp:contains` → `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`.

8. **GET** `http://pod.vardeman.me:3000/vault/meta/context.jsonld` — (default Accept) — **200 OK**
   - Canonical prefix→IRI registry. Prefixes: `wiki`, `cito`, `foaf` (+ implicit `dct`, `skos`). Short-form aliases for predicates (title, subject, references, broader, related, contributor, creator, extends → cito:extends, supports → cito:agreesWith, criticizes → cito:disagreesWith). Short-form aliases for classes Page/Concept/MOC/Source/Person/Procedure/WorkingNote/Hub; `maturity` → `wiki:maturity`.

9. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/` — `Accept: text/turtle` — **200 OK**
   - Affordance catalog. `ldp:contains` four descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`.

10. **GET** `http://pod.vardeman.me:3000/vault/meta/shapes/` — `Accept: text/turtle` — **200 OK**
    - SHACL shape catalog (D77). Five shape files present: `page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl`. (Skill text said this catalog was empty at Rung 1.4 — current Pod has it populated.)

11. **GET** `http://pod.vardeman.me:3000/vault/wiki/pages/.meta` — `Accept: text/turtle` — **200 OK**
    - `solid:forClass` → `wiki:Page`; `wiki:shape` → `meta/shapes/page.shacl.ttl`; `sh:agentInstruction` notes that instances declare `rdf:type` `wiki:Page` or subclass (`wiki:Concept`, `wiki:MOC`, future `vault:TheoryNote`, etc.). Uses `dct:title`, `skos:broader`, `skos:related`.

12. **GET** `http://pod.vardeman.me:3000/vault/wiki/sources/.meta` — `Accept: text/turtle` — **200 OK**
    - `solid:forClass` → `wiki:Source`. Citation records; `dct:identifier` required (DOI/arXiv/citekey); CITO predicates `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`.

13. **GET** `http://pod.vardeman.me:3000/vault/wiki/people/.meta` — `Accept: text/turtle` — **200 OK**
    - `solid:forClass` → `wiki:Person`. FOAF-based; `foaf:name` preferred; `foaf:nick` for aliases.

14. **GET** `http://pod.vardeman.me:3000/vault/wiki/procedures/.meta` — `Accept: text/turtle` — **200 OK**
    - `solid:forClass` → `wiki:Procedure`. Procedural memory; body markdown IS the procedure documentation.

15. **GET** `http://pod.vardeman.me:3000/vault/wiki/working/.meta` — `Accept: text/turtle` — **200 OK**
    - `solid:forClass` → `wiki:WorkingNote`. Permissive shape per D73; promotable via `mem:Crystallize` (deferred).

16. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl` — `Accept: text/turtle` — **200 OK**
    - `wiki:WriteAffordance`. Lists `wiki:governs` predicates the substrate writes from body+frontmatter (D81 Model A): `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: type, created, modified, maturity, aliases, identifier, citekey. Requires capability `markdown-content-projection.ttl`.

17. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl` — `Accept: text/turtle` — **200 OK**
    - `wiki:DerivedNavigationAffordance`. Carries a SELECT walking `skos:broader+` from a `START` IRI. No Pod-side SPARQL endpoint; agent runs the query client-side over the wiki containers.

18. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl` — `Accept: text/turtle` — **200 OK**
    - `wiki:VersionAffordance` conforming to RFC 7089. Append `?ext=timemap` for the TimeMap; `?version=<14-digit-datetime>` for a specific Memento. OriginalResource doubles as TimeGate (RFC 7089 Pattern 1.1).

19. **GET** `http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl` — `Accept: text/turtle` — **200 OK**
    - `wiki:DerivedClassAffordance`. `wiki:deriveClass wiki:Hub`, `wiki:targetClass wiki:Resource`, `wiki:threshold 3`. CONSTRUCT typed as a class-derivation: any `wiki:Resource` with ≥3 distinct `skos:broader` children becomes a `wiki:Hub`. Pod hosts no SPARQL endpoint — agent runs Comunica or similar over the wiki containers.

## Observations

- The discovery chain works, but the entry point differs from the skill text: the Pod's `Link rel=storageDescription` URL (`.well-known/solid`) returns **501**. The actual storage description content lives in `/vault/.meta`, which is the standard `describedby` slot. So in practice the entry hop is `Link rel=describedby` → `.meta` rather than `Link rel=storageDescription`.
- `void:vocabulary` on `.meta` declares only three external IRIs (SKOS, DCT, PROV) plus two relative ones (`<ontology/capability#>`, `<ontology/overlay#>`). CITO and FOAF are *not* in `void:vocabulary` even though they are referenced via the JSON-LD context and the container `sh:agentInstruction` text. `wiki:` itself is referenced everywhere but not listed in `void:vocabulary`.
- The skill mentions a `wiki:contextDocument` / `wiki:affordanceCatalog` / `wiki:typeIndex` / `wiki:shapeCatalog` set of pointers on the storage description. None of these are present in `/vault/.meta`. The only catalog pointer is `cap:catalog → meta/capabilities/`. The affordance and shape catalogs are discovered by listing `/vault/meta/` (which surfaces `affordances/`, `shapes/`, `capabilities/`, and `context.jsonld`).
- No Type Index was reachable from the Pod root's `.meta`. The skill notes Type Index drift at Rung 1.4; in this run there is no `wiki:typeIndex` pointer at all, so I did not fetch `/vault/settings/publicTypeIndex`. Class routing was recovered from each container's `solid:forClass` + `sh:agentInstruction` instead.
- Shape catalog is fully populated (5 shapes), contradicting the skill's "Known substrate gaps" claim that it would be empty.
- A second-layer concept appears that isn't in the skill: `cap:Capability` instances under `/vault/meta/capabilities/`. Affordances declare `wiki:requiresCapability` → capability descriptor, suggesting affordances + capabilities are a two-level model (affordances = what the agent sees, capabilities = what the substrate implements). I did not fetch the individual capability descriptors as they weren't required for resource-type discovery.
- Wiki container layout matches D76 exactly: pages / sources / people / procedures / working.
