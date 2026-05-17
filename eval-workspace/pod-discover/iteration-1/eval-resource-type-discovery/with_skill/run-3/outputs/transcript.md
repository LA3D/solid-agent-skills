# HTTP Transcript

HEAD http://pod.vardeman.me:3000/vault/ → 200
GET  http://pod.vardeman.me:3000/vault/.well-known/solid [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/ [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/context.jsonld [Accept: (default)] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/pages/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/sources/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/people/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/procedures/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/working/.meta [Accept: text/turtle] → 200
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/ → 200
GET  http://pod.vardeman.me:3000/vault/meta/shapes/ [Accept: text/turtle] → 200
HEAD http://pod.vardeman.me:3000/vault/settings/publicTypeIndex → 200
GET  http://pod.vardeman.me:3000/vault/settings/publicTypeIndex [Accept: text/turtle] → 200
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/source.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/resources/concepts/ → 200
GET  http://pod.vardeman.me:3000/vault/wiki/pages/ [Accept: text/turtle] → 200

## Observations

- The pod root HEAD response advertises Memento (`Link rel="timemap"`, `rel="timegate"`, `Vary: accept-datetime`) and the spec-mandated storage description slot (`solid:storageDescription` → `/vault/.well-known/solid`).
- The storage description uses `<../>` (parent) as its subject — it describes the Pod root, not the `.well-known/solid` resource itself. It declares 6 vocabularies via `void:vocabulary` and 4 catalog pointers (`wiki:contextDocument`, `wiki:shapeCatalog`, `wiki:affordanceCatalog`, `wiki:typeIndex`) plus the 5 `rdfs:seeAlso` container pointers.
- All four affordance descriptors in `/vault/meta/affordances/` resolve. Each carries `sh:agentInstruction` for runtime use.
- All five wiki containers (`pages`, `sources`, `people`, `procedures`, `working`) resolve and carry `.meta` files with `wiki:shape` pointers and `sh:agentInstruction` prose.
- **Inconsistency 1 (documented gap):** Shape catalog container at `/vault/meta/shapes/` returns 200 with an empty `ldp:contains` set, but the container `.meta` files of all 5 wiki containers reference shape files under `/vault/meta/shapes/{page,source,person,procedure,working}.shacl.ttl` — these all 404. Spot-checked `page.shacl.ttl` and `source.shacl.ttl`.
- **Inconsistency 2 (documented gap):** Type Index at `/vault/settings/publicTypeIndex` registers Phase 2 PARA-era classes (`skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) with `/vault/resources/...` containers — NOT the wiki:* L3 classes nor the `/vault/wiki/*/` containers. Type Index has drifted from the storage description.
- The Type Index uses `vault:` namespace `https://pod.vardeman.me/vault/ontology#` (note: HTTPS) which appears in storage description as a `void:vocabulary` entry — but the Pod itself is served over HTTP at `pod.vardeman.me:3000`. The vocabulary IRI is not dereferenceable from this host.
- The `urn:example:wiki#` namespace (predicates `wiki:Concept`, `wiki:Source`, etc., plus all affordance-specific predicates like `wiki:governs`, `wiki:projectsFromFrontmatter`) is a non-dereferenceable URN per D79's placeholder choice — agents must rely on the JSON-LD context document for prefix resolution.
- The JSON-LD context defines class shortform `Concept` (not `Page`) for `wiki:Concept` — but container `.meta` for `/vault/wiki/pages/` describes the shape as `wiki:PageShape`. The CLASS for pages is presumably `wiki:Page` (or `wiki:Concept` based on context), but the storage description does NOT explicitly state class-to-container bindings; it must be inferred from container `.meta` prose and the JSON-LD shortform table.
- Markdown-projection descriptor governs a 16-predicate set including `rdf:type`, `dct:*`, `skos:*`, `cito:*`, `wiki:maturity`, and `prov:wasGeneratedBy` — substrate owns these on every body write; agents must use frontmatter, not direct PATCH, to set them.
- Hub-view descriptor pins the hub threshold at 3 (`wiki:threshold 3`), confirming RQ-Hub-1 default.
- Breadcrumb-view and hub-view both `wiki:invokedAt </sparql>` — root-relative URI, which resolves to `http://pod.vardeman.me:3000/sparql` (outside the `/vault/` namespace), suggesting the Comunica sidecar mount point. Not fetched in this run.
