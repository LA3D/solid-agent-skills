# Pod Discovery Report — http://pod.vardeman.me:3000/vault/

## 1. Discovery path

| # | Method | URL | Accept | Status | What I learned |
|---|---|---|---|---|---|
| 1 | HEAD | `/vault/` | (default) | 200 | Pod root. Link headers expose: `rel="storageDescription"` → `/vault/.well-known/solid`; `rel="describedby"` → `/vault/.meta`; `rel="timemap"`/`rel="timegate"`; `Vary: accept-datetime`. |
| 2 | GET | `/vault/.well-known/solid` | text/turtle | **501** | NotImplementedHttpError. The advertised storageDescription is non-functional on this Pod (anomaly). |
| 3 | GET | `/vault/.meta` | text/turtle | 200 | Real storage description. Declares `pim:Storage` + `void:Dataset` + `dcat:DataService`; vocabularies via `void:vocabulary`; conformsTo fabric:CoreProfile + fabric:SolidPodProfile; points at `meta/capabilities/`; children: ontology/, wiki/, settings/, profile/, meta/. |
| 4 | GET | `/vault/meta/capabilities/` | text/turtle | 200 | Substrate capability catalog. Three descriptors. |
| 5–7 | GET | `/vault/meta/capabilities/{derived-view,markdown-content-projection,time-travel}.ttl` | text/turtle | 200 | Three substrate primitives (see §4). |
| 8 | GET | `/vault/wiki/` | text/turtle | 200 | Wiki-memory L2 application root. ldp:contains: pages/, sources/, people/, procedures/, working/. |
| 9–13 | GET | `/vault/wiki/{pages,sources,people,procedures,working}/.meta` | text/turtle | 200 | Each container declares `solid:forClass` + `wiki:shape` + class-level `sh:agentInstruction`. |
| 14 | GET | `/vault/meta/` | text/turtle | 200 | Pod-level metadata: capabilities/, context.jsonld, shapes/, affordances/. |
| 15 | GET | `/vault/meta/affordances/` | text/turtle | 200 | Affordance catalog with 4 descriptors. |
| 16 | GET | `/vault/meta/context.jsonld` | (default) | 200 | JSON-LD prefix + short-form registry. |
| 17 | GET | `/vault/meta/shapes/` | text/turtle | 200 | 5 SHACL shape files (page/source/person/procedure/working). |
| 18 | GET | `/vault/settings/publicTypeIndex` | text/turtle | 200 | 5 TypeRegistrations (class → instanceContainer). |
| 19–22 | GET | `/vault/meta/affordances/{markdown-projection,hub-view,breadcrumb-view,memento}.ttl` | text/turtle | 200 | L3 affordance descriptors (see §4). |

## 2. Resource types supported (class → container)

Confirmed cross three independent sources: Type Index registrations, container `.meta` `solid:forClass`, and shape catalog file names.

| Class IRI | Short form | Instance container | Shape | Distinguishing semantics |
|---|---|---|---|---|
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Page` | `wiki:Page` | `http://pod.vardeman.me:3000/vault/wiki/pages/` | `meta/shapes/page.shacl.ttl` | General wiki content; subclasses include wiki:Concept, wiki:MOC. dct:title required; skos:broader for parent; skos:related lateral. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Source` | `wiki:Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | `meta/shapes/source.shacl.ttl` | Citation records. dct:identifier required (DOI, arXiv ID, citekey). CITO predicates for citation relations. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Person` | `wiki:Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` | `meta/shapes/person.shacl.ttl` | FOAF-based. foaf:name preferred over dct:title; foaf:nick for aliases. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Procedure` | `wiki:Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `meta/shapes/procedure.shacl.ttl` | Procedural memory — agent instructions, workflows, skills. Body markdown is the procedure documentation. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#WorkingNote` | `wiki:WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | `meta/shapes/working.shacl.ttl` | Low-ceremony two-stage-commit working memory (D73). Permissive shape. Promotion to durable container via mem:Crystallize is deferred. |

Additional class IRIs surfaced by the context document but not directly registered: `wiki:Concept`, `wiki:MOC`, `wiki:Hub`, `wiki:Resource`. `wiki:Concept` and `wiki:MOC` are subclasses of `wiki:Page` (per the pages/ agentInstruction). `wiki:Hub` is *derived* — agents materialize it client-side via the hub-view affordance (see §4). `wiki:Resource` is the parent class targeted by hub derivation.

## 3. Vocabularies declared

From `void:vocabulary` on `/vault/.meta` and the affordance/context documents:

- `http://www.w3.org/2004/02/skos/core#` — SKOS (broader, related)
- `http://purl.org/dc/terms/` — Dublin Core Terms (title, identifier, created, modified, references, subject, contributor, creator, conformsTo, description)
- `http://www.w3.org/ns/prov#` — PROV-O (wasGeneratedBy)
- `http://purl.org/spar/cito/` — CiTO (extends, agreesWith, disagreesWith) — via affordance + context
- `http://xmlns.com/foaf/0.1/` — FOAF (name, nick) — via container agentInstruction + context
- `http://pod.vardeman.me:3000/vault/ontology/capability#` — pod-local capability vocab (Capability, DerivedView, ContentProjection, TimeTravel, catalog, requires, version, contentType, implementedBy, configurationShape)
- `http://pod.vardeman.me:3000/vault/ontology/overlay#` — pod-local overlay vocab (wiki-memory overlay)
- `http://pod.vardeman.me:3000/vault/ontology/wiki#` — pod-local wiki-memory L3 vocab (Page, Concept, MOC, Source, Person, Procedure, WorkingNote, Hub, Resource, WriteAffordance, DerivedClassAffordance, DerivedNavigationAffordance, VersionAffordance, shape, installedBy, governs, projectsFromFrontmatter, classHintTable, requiresCapability, deriveClass, targetClass, threshold, constructQuery, selectQuery, maturity, conformsTo)

Also referenced: LDP (`http://www.w3.org/ns/ldp#`), POSIX stat (`http://www.w3.org/ns/posix/stat#`), VoID (`http://rdfs.org/ns/void#`), DCAT (`http://www.w3.org/ns/dcat#`), pim space (`http://www.w3.org/ns/pim/space#`), SHACL (`http://www.w3.org/ns/shacl#`), Solid terms (`http://www.w3.org/ns/solid/terms#`), and the cogitarelink fabric profile namespace (`https://w3id.org/cogitarelink/fabric#`).

## 4. Substrate affordances advertised

### Substrate capabilities (`/vault/meta/capabilities/`) — what primitives the substrate implements
1. **`cap:DerivedView`** v1.0 (derived-view.ttl) — Pod publishes affordance descriptors carrying CONSTRUCT/SELECT queries. Pod does NOT host a SPARQL endpoint; agents execute queries client-side (Comunica recommended) against rdfs:seeAlso container roots.
2. **`cap:ContentProjection`** v1.0 (markdown-content-projection.ttl) — On write of text/markdown, parse frontmatter + body wikilinks, project triples into resource's `.meta` per governing wiki:WriteAffordance. D58/D71/D81.
3. **`cap:TimeTravel`** v1.0 (time-travel.ttl) — RFC 7089 Memento. Trellis-style `?ext=timemap` and `?version=<14-digit-datetime>`. Pattern 1.1 (OriginalResource = TimeGate). Tombstones return 410 Gone on plain GET; TimeMap still resolves.

### L3 affordance descriptors (`/vault/meta/affordances/`) — what L3 behaviors the overlay installs
1. **`wiki:WriteAffordance`** (markdown-projection.ttl) — installs the markdown projection. Governs 16 predicates (rdf:type, dct:title/identifier/created/modified/references/subject/contributor/creator, skos:broader/related, cito:extends/agreesWith/disagreesWith, wiki:maturity, prov:wasGeneratedBy). Projects 7 frontmatter keys (type, created, modified, maturity, aliases, identifier, citekey). Class-hint table → context.jsonld. **Rule:** to express any governed predicate, edit body+frontmatter — do not PATCH `.meta`.
2. **`wiki:DerivedClassAffordance`** (hub-view.ttl) — derives `wiki:Hub` from `wiki:Resource` when ≥3 distinct children reference it via skos:broader. Carries the CONSTRUCT query; client-side execution.
3. **`wiki:DerivedNavigationAffordance`** (breadcrumb-view.ttl) — walks skos:broader+ to root. Carries `SELECT ?ancestor` with `<START>` placeholder; client-side execution.
4. **`wiki:VersionAffordance`** (memento.ttl) — RFC 7089 time-travel on every resource.

## 5. Inconsistencies, 404s, surprises

1. **storageDescription Link target returns 501.** The Pod root advertises `Link: </vault/.well-known/solid>; rel="storageDescription"` (D44 contract), but `GET /vault/.well-known/solid` returns `501 NotImplementedHttpError` with message *"Only supports descriptions of storage containers."* The skill's Step 1/Step 2 chain assumes this resource resolves. **Working substitute:** the `Link: rel="describedby"` on the root resolves to `/vault/.meta`, which serves the real storage description (pim:Storage typing, void:vocabulary declarations, cap:catalog pointer). Discovery succeeds via `describedby` rather than `storageDescription`.

2. **Capability/affordance split not in the skill.** The skill describes a single "affordance catalog" at `/vault/meta/affordances/`. This Pod actually publishes **two** catalogs: `meta/capabilities/` (substrate primitives — D-View / ContentProjection / TimeTravel) and `meta/affordances/` (L3 overlay descriptors that reference those primitives via `wiki:requiresCapability`). The capabilities catalog is the only one reachable from the root `.meta` (via `cap:catalog`); the affordances catalog is reached by browsing `/vault/meta/`. Cleaner separation than the skill documents.

3. **Skill's "known substrate gap" claims are stale.** The skill warns of (a) Type Index drift with Phase 2 PARA types and (b) empty shape catalog. Both are now wrong:
   - `/vault/settings/publicTypeIndex` is clean wiki-memory L3 (5 TypeRegistrations matching the 5 containers exactly).
   - `/vault/meta/shapes/` contains all 5 `.shacl.ttl` files (page, source, person, procedure, working).

4. **Two parallel vocabularies for "what the substrate can do".** `cap:*` (Capability, DerivedView, ContentProjection, TimeTravel) is a parallel taxonomy to `wiki:WriteAffordance`, `wiki:DerivedClassAffordance`, `wiki:DerivedNavigationAffordance`, `wiki:VersionAffordance`. The affordances point at the capabilities via `wiki:requiresCapability`, so the relationship is layered, not redundant — but the skill collapses them into one concept and would mislead a stricter reader.

5. **The skill enumerates 5 rdfs:seeAlso to wiki containers from the storage description.** On this Pod, `/vault/.meta` does NOT carry `rdfs:seeAlso` triples for the wiki containers. The wiki containers are reachable by following `ldp:contains` from the root (which lists `wiki/`) and then enumerating `/vault/wiki/`. Discovery still works, just by a different mechanism than the skill predicts.

6. **No 404s encountered.** Only the 501 on `/.well-known/solid` and one 405 from HEAD on the same URL (server reports `Allow: OPTIONS, GET, PATCH, PUT, DELETE` — no HEAD — but GET on the same URL still returns 501, not 200).
