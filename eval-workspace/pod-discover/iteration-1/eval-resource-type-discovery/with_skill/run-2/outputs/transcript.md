# HTTP Transcript — Pod Resource Type Discovery

## Requests

```
HEAD http://pod.vardeman.me:3000/vault/ [no Accept] → 200
GET  http://pod.vardeman.me:3000/vault/.well-known/solid [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/context.jsonld [no Accept] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/ [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/pages/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/sources/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/people/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/procedures/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/wiki/working/.meta [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/shapes/ [Accept: text/turtle] → 200
GET  http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl [Accept: text/turtle] → 404
GET  http://pod.vardeman.me:3000/vault/settings/publicTypeIndex [Accept: text/turtle] → 200
```

## Observations

### Step 1 — Root HEAD: spec-mandated storage description link

The root response carries the entry point per D44:

```
Link: <http://pod.vardeman.me:3000/vault/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"
Link: <http://pod.vardeman.me:3000/vault/?ext=timemap>; rel="timemap"
Link: <http://pod.vardeman.me:3000/vault/>; rel="timegate"
Vary: accept-datetime
```

The `timemap`/`timegate`/`Vary: accept-datetime` headers already advertise Memento (RFC 7089 §4.1.1) at the root, before any catalog is read.

### Step 2 — Storage description (`/.well-known/solid`)

Declares:
- `pim:Storage`, `void:Dataset`, `dcat:DataService`
- `dct:conformsTo` → `fabric:CoreProfile`, `fabric:SolidPodProfile`
- `void:feature` → `fabric:LDPBrowse`
- `void:vocabulary` (6 IRIs — see report)
- Four catalog pointers: `wiki:contextDocument`, `wiki:shapeCatalog`, `wiki:affordanceCatalog`, `wiki:typeIndex`
- Five `rdfs:seeAlso` containers under `/vault/wiki/`

### Step 3 — JSON-LD context

Maps short names to vocabularies: `extends → cito:extends`, `supports → cito:agreesWith`, `criticizes → cito:disagreesWith`, `Concept/Source/Person/Procedure/WorkingNote/Hub → wiki:*`, plus DCT/SKOS/FOAF/PROV/LDP/SHACL prefixes.

### Step 4 — Affordance catalog

Four affordances:

- **markdown-projection** (`wiki:WriteAffordance`): substrate governs 15 predicates on body+frontmatter write — `rdf:type`, `dct:{title,identifier,created,modified,references,subject,contributor,creator}`, `skos:{broader,related}`, `cito:{extends,agreesWith,disagreesWith}`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: type, created, modified, maturity, aliases, identifier, citekey. Agent must edit body/frontmatter for governed predicates — direct `.meta` PATCH for these will be overwritten (D81 Model A).
- **breadcrumb-view** (`wiki:DerivedNavigationAffordance`): SPARQL CONSTRUCT walks `skos:broader+` from a `<START>` resource; invoked at `/sparql`.
- **memento** (`wiki:VersionAffordance`): `?ext=timemap` for TimeMap, `?version=<14-digit-datetime>` for a Memento. RFC 7089 Pattern 1.1.
- **hub-view** (`wiki:DerivedClassAffordance`): a `wiki:Resource` becomes a `wiki:Hub` when ≥3 `wiki:Resource` instances point at it via `skos:broader`. CONSTRUCT-materialized in-memory at `/sparql`.

### Step 5 — Five wiki containers, each with `.meta` `sh:agentInstruction`

| Container | Title | Shape file declared | Instruction excerpt |
|---|---|---|---|
| `/vault/wiki/pages/` | "Wiki Pages" | `page.shacl.ttl` | "Shape: wiki:PageShape (permissive). Use dct:title…skos:broader…skos:related…" |
| `/vault/wiki/sources/` | "Wiki Sources" | `source.shacl.ttl` | "Shape: wiki:SourceShape. dct:identifier required (DOI, arXiv ID, or citekey). Use cito:extends, cito:agreesWith, cito:disagreesWith…" |
| `/vault/wiki/people/` | "Wiki People" | `person.shacl.ttl` | "Shape: wiki:PersonShape. FOAF-based with foaf:nick for aliases…" |
| `/vault/wiki/procedures/` | "Wiki Procedures" | `procedure.shacl.ttl` | "Shape: wiki:ProcedureShape. sh:agentInstruction on .meta carries the procedure body…" |
| `/vault/wiki/working/` | "Working Memory" | `working.shacl.ttl` | "Permissive shape: any wiki:WorkingNote. Use mem:Crystallize to promote to a durable container after validation." (D73) |

Each container declares a SHACL shape via `wiki:shape` → `../../meta/shapes/<n>.shacl.ttl`.

### Inconsistencies

1. **Shape files 404** — `meta/shapes/` container resolves (200) but lists no `ldp:contains` entries; referenced `page.shacl.ttl` returns 404. Known substrate gap (per skill context). Container `.meta` `sh:agentInstruction` text carries the actual guidance.
2. **Type Index drift** — `/vault/settings/publicTypeIndex` registers Phase 2 PARA types (`skos:Concept` → `/vault/resources/concepts/`, `vault:TheoryNote` → `/vault/resources/theories/`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) under `/vault/resources/…` and `/vault/projects/` — none of which appear in `rdfs:seeAlso`. The L3 `wiki:*` classes are NOT registered. Authoritative class→container routing is `rdfs:seeAlso` + each container's `.meta`, not Type Index.
3. **Two `void:vocabulary` triples** on the storage description (legal RDF; surprising in serialization — two separate property lines instead of a comma-joined list).
