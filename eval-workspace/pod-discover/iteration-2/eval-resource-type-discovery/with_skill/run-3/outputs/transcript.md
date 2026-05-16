# Discovery transcript — pod.vardeman.me:3000/vault/

## Numbered requests

1. `HEAD http://pod.vardeman.me:3000/vault/` — Accept: (default) → 200.
   - Learned: pod root is an `ldp:BasicContainer`. Link headers expose:
     - `rel="describedby"` → `/vault/.meta`
     - `rel="http://www.w3.org/ns/solid/terms#storageDescription"` → `/vault/.well-known/solid`
     - `rel="timegate"` / `rel="timemap"` (Memento RFC 7089 advertised, D67)
     - `rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"` (Solid Notifications)
   - `Vary: accept-datetime` confirms Memento.

2. `GET http://pod.vardeman.me:3000/vault/.well-known/solid` — Accept: text/turtle → 200 but body returns a `NotImplementedHttpError` saying "Only supports descriptions of storage containers." Treating the storageDescription as a node tied to the resource only fires when the target IS the storage container; following `Link: rel="storageDescription"` from a sub-resource works but visiting the well-known directly yields a stub.
   - This means the "storage description document" is effectively the pod root container itself.

3. `HEAD http://pod.vardeman.me:3000/vault/.well-known/solid` → 405 Method Not Allowed (Allow: OPTIONS, GET, PATCH, PUT, DELETE). Confirms point above.

4. `GET http://pod.vardeman.me:3000/vault/` — Accept: text/turtle → 200.
   - Pod root describes itself: `a pim:Storage, void:Dataset, dcat:DataService`.
   - `dct:conformsTo` → `fabric:CoreProfile`, `fabric:SolidPodProfile`.
   - `void:vocabulary` → `skos:`, `dct:`, `prov:`, `<vault/ontology/capability#>`, `<vault/ontology/overlay#>`.
   - `void:feature` → `fabric:LDPBrowse`.
   - `cap:catalog` → `/vault/meta/capabilities/`.
   - Top-level children: `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`.

5. `GET http://pod.vardeman.me:3000/vault/.meta` — Accept: text/turtle → 200.
   - Same self-description as the container body. Confirms storage description data is on the container resource.

6. `GET http://pod.vardeman.me:3000/vault/meta/context.jsonld` — Accept: application/ld+json → 200.
   - JSON-LD context document with prefix registry: `wiki:` `<vault/ontology/wiki#>`, `cito:` `<purl.org/spar/cito/>`, `foaf:` `<xmlns.com/foaf/0.1/>`.
   - Short-form term map: `title→dct:title`, `references→dct:references`, `subject→dct:subject`, `creator→dct:creator`, `contributor→dct:contributor`, `broader→skos:broader`, `related→skos:related`, `extends→cito:extends`, `supports→cito:agreesWith`, `criticizes→cito:disagreesWith`, `maturity→wiki:maturity`.
   - Type aliases: `Page`, `Concept`, `MOC`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub` → `wiki:*`.

7. `GET http://pod.vardeman.me:3000/vault/meta/affordances/` — Accept: text/turtle → 200.
   - LDP container with 4 descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`.

8. `GET http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl` — Accept: text/turtle → 200.
   - `wiki:WriteAffordance`. Lists 14 governed predicates (rdf:type, dct:title, dct:identifier, dct:created, dct:modified, dct:references, dct:subject, dct:contributor, dct:creator, skos:broader, skos:related, cito:extends, cito:agreesWith, cito:disagreesWith, wiki:maturity, prov:wasGeneratedBy).
   - Projects from frontmatter keys: type/created/modified/maturity/aliases/identifier/citekey.
   - References `<../context.jsonld>` as the class-hint table.
   - Substrate writes governed predicates; agent extends others (D81 Model A).

9. `GET http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl` → 200.
   - `wiki:DerivedNavigationAffordance`. SELECT walks `skos:broader+`. Agent runs SPARQL externally — Pod does not host SPARQL endpoint.

10. `GET http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl` → 200.
    - `wiki:VersionAffordance`. `?ext=timemap` for TimeMap; `?version=<14-digit-datetime>` for a Memento. RFC 7089 Pattern 1.1.

11. `GET http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl` → 200.
    - `wiki:DerivedClassAffordance`. Derives `wiki:Hub` when ≥3 wiki:Resource instances point at a resource via `skos:broader`. Threshold = 3. CONSTRUCT query embedded.

12. `GET http://pod.vardeman.me:3000/vault/wiki/` — Accept: text/turtle → 200.
    - 5 wiki sub-containers via `ldp:contains`: `pages/`, `sources/`, `people/`, `procedures/`, `working/`.

13. `GET http://pod.vardeman.me:3000/vault/wiki/pages/.meta` → 200.
    - `solid:forClass <ontology/wiki#Page>`; `wiki:shape <meta/shapes/page.shacl.ttl>`; `sh:agentInstruction` explains the class and that subclasses (`wiki:Concept`, `wiki:MOC`, future `vault:TheoryNote`) live here.

14. `GET http://pod.vardeman.me:3000/vault/wiki/sources/.meta` → 200.
    - `solid:forClass <ontology/wiki#Source>`; `wiki:shape <meta/shapes/source.shacl.ttl>`; agent instruction notes `dct:identifier` required and CITO predicates for citations.

15. `GET http://pod.vardeman.me:3000/vault/wiki/people/.meta` → 200.
    - `solid:forClass <ontology/wiki#Person>`; `wiki:shape <meta/shapes/person.shacl.ttl>`; FOAF-based, `foaf:nick` for aliases.

16. `GET http://pod.vardeman.me:3000/vault/wiki/procedures/.meta` → 200.
    - `solid:forClass <ontology/wiki#Procedure>`; `wiki:shape <meta/shapes/procedure.shacl.ttl>`; body markdown = procedure body.

17. `GET http://pod.vardeman.me:3000/vault/wiki/working/.meta` → 200.
    - `solid:forClass <ontology/wiki#WorkingNote>`; `wiki:shape <meta/shapes/working.shacl.ttl>`; permissive, D73 two-stage commit.

18. `GET http://pod.vardeman.me:3000/vault/meta/shapes/` — Accept: text/turtle → 200.
    - LDP container titled "SHACL Shape Catalog" containing five .shacl.ttl files (page, source, person, procedure, working) — sized 1116 / 751 / 651 / 596 / 533 bytes. **Contradicts the skill's documented "Known gap #2" that this container holds no shapes.**

19. `HEAD http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl` → 200, Content-Type text/turtle.

20. `GET http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl` → 200.
    - `wiki:PageShape a sh:NodeShape; sh:targetClass wiki:Page; sh:closed false`. Confirms class-based shape targeting (D78). Carries `sh:agentInstruction` (D50). Substrate governance enumerated.

21. `GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex` — Accept: text/turtle → 200.
    - 5 `solid:TypeRegistration` entries: `wiki:Page → /vault/wiki/pages/`, `wiki:Source → /vault/wiki/sources/`, `wiki:Person → /vault/wiki/people/`, `wiki:Procedure → /vault/wiki/procedures/`, `wiki:WorkingNote → /vault/wiki/working/`.
    - **Contradicts the skill's "Known gap #1"**: the Type Index already uses wiki-memory classes, not Phase 2 PARA types.

22. `GET http://pod.vardeman.me:3000/vault/wiki/pages/` → 200.
    - Empty container (no instances yet).

## Observations

- **The storage description endpoint is the pod root**: the well-known URL itself returns a NotImplemented stub. Follow `rel="storageDescription"` from any concrete resource and read the *target* container's description (the root LDP container with `void:vocabulary`/`void:feature`/`cap:catalog`).
- **JSON-LD context is the canonical prefix registry** (D79). It maps both predicates (extends/supports/criticizes → CITO) and classes (Page/Concept/MOC/Source/Person/Procedure/WorkingNote/Hub → wiki:*).
- **Affordance catalog** (D52): four descriptors — one write (markdown-projection), two derived views (hub-view, breadcrumb-view), one versioning (memento).
- **Five class-targeted containers** under `/vault/wiki/`, each declaring `solid:forClass`, `wiki:shape`, and `sh:agentInstruction` on its `.meta`.
- **SHACL shapes are present** at `/vault/meta/shapes/*.shacl.ttl` — five class-targeted node shapes with substrate-governance annotation.
- **No SPARQL endpoint is hosted by the Pod**; affordance descriptors instruct agents to run derived-view SPARQL in their own engine (Comunica) against the wiki containers (RQ-Pod-4 / D45 CONSTRUCT view pattern).
- **Memento advertised** on every resource: `Vary: accept-datetime`, `Link: ...?ext=timemap rel="timemap"`, `Link: <self> rel="timegate"`.
- **Notifications**: `rel="updatesViaStreamingHttp2023"` Link on every resource.
- Pod root declares `void:vocabulary` for only SKOS, DCT, PROV plus pod-local capability/overlay namespaces — narrower than the skill's listed set; CITO/FOAF/wiki: appear in the JSON-LD context and in shapes/affordances but are not enumerated at the storage description's `void:vocabulary` level. Possible D49 gap.
