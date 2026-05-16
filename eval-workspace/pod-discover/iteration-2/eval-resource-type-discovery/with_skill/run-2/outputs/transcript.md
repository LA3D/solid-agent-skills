# Discovery Transcript

## 1. HEAD http://pod.vardeman.me:3000/vault/
- Method: HEAD
- Accept: (default)
- Status: 200
- Observation: Pod root container. Link headers carry `rel="http://www.w3.org/ns/solid/terms#storageDescription"` pointing at `http://pod.vardeman.me:3000/vault/.well-known/solid`, plus `rel="describedby"` → `/vault/.meta`, `rel="timemap"`/`rel="timegate"` (Memento), and `rel="type"` → ldp:Container/BasicContainer/Resource. `Vary: accept-datetime` confirms Memento support.

## 2. GET http://pod.vardeman.me:3000/vault/.well-known/solid
- Method: GET
- Accept: text/turtle
- Status: 501 (NotImplementedHttpError, "Only supports descriptions of storage containers.")
- Observation: The advertised storageDescription URL returns 501. Skill assumed this would resolve to a real document; on this Pod it does not. Fall back to the `describedby` Link → `/vault/.meta` which is the actual storage description for the container.

## 3. GET http://pod.vardeman.me:3000/vault/.meta
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: Real storage description. Declares the root resource `<../>` as `pim:Storage`, `void:Dataset`, `dcat:DataService`; `dct:conformsTo` fabric:CoreProfile + fabric:SolidPodProfile. **`void:vocabulary`** declares 5 IRIs: SKOS, DCT, PROV, plus pod-local `ontology/capability#` and `ontology/overlay#`. `void:feature` = fabric:LDPBrowse. Pointer to catalog: `cap:catalog <meta/capabilities/>`. Container children: ontology/, wiki/, settings/, profile/, meta/.

## 4. GET http://pod.vardeman.me:3000/vault/meta/capabilities/
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: Substrate capability catalog with `sh:agentInstruction` telling agents to enumerate ldp:contains. Three capability descriptors: derived-view.ttl, markdown-content-projection.ttl, time-travel.ttl.

## 5. GET http://pod.vardeman.me:3000/vault/meta/capabilities/derived-view.ttl
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: `cap:DerivedView` v1.0. Pod publishes affordance descriptors with CONSTRUCT/SELECT queries; does NOT run them server-side. Agents bring their own SPARQL engine (Comunica) and run client-side against rdfs:seeAlso container roots.

## 6. GET http://pod.vardeman.me:3000/vault/meta/capabilities/markdown-content-projection.ttl
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: `cap:ContentProjection` v1.0 for text/markdown. On write, parses frontmatter + body wikilinks, projects triples into `.meta` per the governing wiki:WriteAffordance descriptor. D58/D71/D81.

## 7. GET http://pod.vardeman.me:3000/vault/meta/capabilities/time-travel.ttl
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: `cap:TimeTravel` v1.0, dct:conformsTo RFC 7089. Trellis-style `?ext=timemap` / `?version=<14-digit>` URIs. Pattern 1.1 (OriginalResource = TimeGate).

## 8. GET http://pod.vardeman.me:3000/vault/wiki/
- Method: GET
- Accept: text/turtle
- Status: 200
- Observation: Wiki-memory L2 application root (`wiki:installedBy <ontology/overlay#wiki-memory>`). ldp:contains 5 typed subcontainers: pages/, sources/, people/, procedures/, working/.

## 9. GET http://pod.vardeman.me:3000/vault/wiki/pages/.meta
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `solid:forClass <ontology/wiki#Page>`. Shape: meta/shapes/page.shacl.ttl. agentInstruction: "wiki:Page or subclass (wiki:Concept, wiki:MOC, …). dct:title required, skos:broader for parent, skos:related lateral."

## 10. GET http://pod.vardeman.me:3000/vault/wiki/sources/.meta
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `solid:forClass <ontology/wiki#Source>`. Shape: source.shacl.ttl. agentInstruction: "Citation records. dct:identifier required (DOI, arXiv, citekey). Use cito:extends/agreesWith/disagreesWith."

## 11. GET http://pod.vardeman.me:3000/vault/wiki/people/.meta
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `solid:forClass <ontology/wiki#Person>`. Shape: person.shacl.ttl. FOAF-based; foaf:name + foaf:nick aliases.

## 12. GET http://pod.vardeman.me:3000/vault/wiki/procedures/.meta
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `solid:forClass <ontology/wiki#Procedure>`. Shape: procedure.shacl.ttl. Procedural memory; body markdown is the procedure documentation.

## 13. GET http://pod.vardeman.me:3000/vault/wiki/working/.meta
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `solid:forClass <ontology/wiki#WorkingNote>`. Shape: working.shacl.ttl. Low-ceremony D73 working memory; permissive; `mem:Crystallize` promotion deferred.

## 14. GET http://pod.vardeman.me:3000/vault/meta/
- Method: GET; Accept: text/turtle; Status: 200
- Observation: Pod-level metadata container. ldp:contains capabilities/, context.jsonld, shapes/, affordances/.

## 15. GET http://pod.vardeman.me:3000/vault/meta/affordances/
- Method: GET; Accept: text/turtle; Status: 200
- Observation: Affordance Catalog, "Discoverable L3 capabilities of this Pod." Four descriptors: markdown-projection.ttl, breadcrumb-view.ttl, memento.ttl, hub-view.ttl.

## 16. GET http://pod.vardeman.me:3000/vault/meta/context.jsonld
- Method: GET; Accept: (default — application/ld+json); Status: 200
- Observation: JSON-LD context. Prefix registry: wiki, cito, foaf (DCT/SKOS/PROV are inherited but used via short-form keys). Short-form predicates: title→dct:title, broader→skos:broader, related→skos:related, references→dct:references, contributor/creator→dct:contributor/creator, extends→cito:extends, supports→cito:agreesWith, criticizes→cito:disagreesWith. Class short-forms: Page, Concept, MOC, Source, Person, Procedure, WorkingNote, Hub. Plus wiki:maturity.

## 17. GET http://pod.vardeman.me:3000/vault/meta/shapes/
- Method: GET; Accept: text/turtle; Status: 200
- Observation: SHACL shape catalog. Contrary to the skill's "shape catalog holds no .shacl.ttl files" note, this Pod has all 5: page.shacl.ttl, source.shacl.ttl, person.shacl.ttl, procedure.shacl.ttl, working.shacl.ttl.

## 18. GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex
- Method: GET; Accept: text/turtle; Status: 200
- Observation: Clean wiki-memory L3 Type Index. Five TypeRegistration entries map wiki:Page → /wiki/pages/, wiki:Source → /wiki/sources/, wiki:Person → /wiki/people/, wiki:Procedure → /wiki/procedures/, wiki:WorkingNote → /wiki/working/. Skill's "Phase 2 PARA drift" warning does NOT apply to this Pod state — the Type Index is current.

## 19. GET http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `wiki:WriteAffordance`. Requires markdown-content-projection capability. `wiki:governs` = 16 predicates (rdf:type, dct:title/identifier/created/modified/references/subject/contributor/creator, skos:broader/related, cito:extends/agreesWith/disagreesWith, wiki:maturity, prov:wasGeneratedBy). `wiki:projectsFromFrontmatter` keys: type, created, modified, maturity, aliases, identifier, citekey. classHintTable → context.jsonld.

## 20. GET http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `wiki:DerivedClassAffordance`. Derives wiki:Hub from wiki:Resource when ≥3 children via skos:broader. Threshold = 3. Carries CONSTRUCT query for client-side execution.

## 21. GET http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `wiki:DerivedNavigationAffordance`. SPARQL `SELECT ?ancestor WHERE { <START> skos:broader+ ?ancestor }`. Client-side execution.

## 22. GET http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl
- Method: GET; Accept: text/turtle; Status: 200
- Observation: `wiki:VersionAffordance` conforming to RFC 7089. `?ext=timemap` / `?version=<14-digit>`; OriginalResource = TimeGate (Pattern 1.1).
