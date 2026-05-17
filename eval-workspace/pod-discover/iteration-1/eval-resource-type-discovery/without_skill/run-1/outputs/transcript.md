# HTTP Transcript

## Requests

```
GET http://pod.vardeman.me:3000/vault/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/.well-known/solid [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/.meta [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/context.jsonld [Accept: application/ld+json] → 200
GET http://pod.vardeman.me:3000/vault/meta/affordances/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/shapes/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl [Accept: text/turtle] → 200
HEAD http://pod.vardeman.me:3000/vault/wiki/pages/ → 200
HEAD http://pod.vardeman.me:3000/vault/wiki/sources/ → 200
HEAD http://pod.vardeman.me:3000/vault/wiki/people/ → 200
HEAD http://pod.vardeman.me:3000/vault/wiki/procedures/ → 200
HEAD http://pod.vardeman.me:3000/vault/wiki/working/ → 200
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/source.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/person.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/procedure.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/working.shacl.ttl → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/resource.shacl.ttl → 404
GET http://pod.vardeman.me:3000/vault/wiki/pages/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/profile/card [Accept: text/turtle] → 200
HEAD http://pod.vardeman.me:3000/vault/profile/ → 200
HEAD http://pod.vardeman.me:3000/vault/resources/concepts/ → 200
HEAD http://pod.vardeman.me:3000/vault/resources/theories/ → 200
HEAD http://pod.vardeman.me:3000/vault/resources/literature/ → 200
HEAD http://pod.vardeman.me:3000/vault/resources/methods/ → 200
HEAD http://pod.vardeman.me:3000/vault/projects/ → 200
GET http://pod.vardeman.me:3000/vault/resources/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/resources/concepts/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/wiki/sources/.meta [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/wiki/people/.meta [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/wiki/procedures/.meta [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/wiki/working/.meta [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/procedures/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/procedures/shapes/ [Accept: text/turtle] → 200
GET http://pod.vardeman.me:3000/vault/ontology/ [Accept: text/turtle] → 200
```

## Observations

### Vault root (GET /vault/)
- `Link: <…/vault/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"` — the canonical pointer to the storage description.
- `Link: <…?ext=timemap>; rel="timemap"`, `<…/vault/>; rel="timegate"`, and `Vary: accept-datetime` — RFC 7089 Memento advertised at the root.
- Root types: `pim:Storage`, `pim:Workspace`, `ldp:BasicContainer`.
- `ldp:contains`: `resources/`, `ontology/`, `wiki/`, `settings/`, `areas/`, `procedures/`, `profile/`, `projects/`, `archive/`, `meta/`.

### Storage description (.well-known/solid)
- Subject is the storage `<../>`; typed as `pim:Storage`, `void:Dataset`, `dcat:DataService`.
- `void:vocabulary` declares: `skos`, `dct`, `prov`, `<https://pod.vardeman.me/vault/ontology#>`, `<urn:example:wiki#>`, `cito`.
- `void:feature <https://w3id.org/cogitarelink/fabric#LDPBrowse>`.
- `wiki:contextDocument` → `meta/context.jsonld`; `wiki:shapeCatalog` → `meta/shapes/`; `wiki:affordanceCatalog` → `meta/affordances/`; `wiki:typeIndex` → `settings/publicTypeIndex`.
- `rdfs:seeAlso` → five wiki containers: `wiki/pages/`, `wiki/sources/`, `wiki/people/`, `wiki/procedures/`, `wiki/working/`.
- `wiki:conformsTo wiki:L3Profile`.

### Type index (settings/publicTypeIndex)
Five `solid:TypeRegistration` entries:
- `skos:Concept` → `/vault/resources/concepts/`
- `vault:TheoryNote` → `/vault/resources/theories/`
- `vault:LiteratureNote` → `/vault/resources/literature/`
- `vault:MethodNote` → `/vault/resources/methods/`
- `vault:Project` → `/vault/projects/`

### Affordance catalog
Four descriptors:
- `markdown-projection.ttl` — `wiki:WriteAffordance`. Lists `wiki:governs` predicates (rdf:type, dct:title/identifier/created/modified/references/subject/contributor/creator, skos:broader/related, cito:extends/agreesWith/disagreesWith, wiki:maturity, prov:wasGeneratedBy). Frontmatter projected from `type, created, modified, maturity, aliases, identifier, citekey`.
- `memento.ttl` — `wiki:VersionAffordance`. `?ext=timemap` for TimeMap, `?version=<14-digit-datetime>` for a Memento.
- `hub-view.ttl` — `wiki:DerivedClassAffordance`. CONSTRUCT at `/sparql`; threshold N=3 incoming `skos:broader`.
- `breadcrumb-view.ttl` — `wiki:DerivedNavigationAffordance`. Walks `skos:broader+` from a given start node.

### Wiki containers (.meta files)
Each wiki sub-container's `.meta` carries `wiki:shape` pointing at `meta/shapes/{page,source,person,procedure,working}.shacl.ttl` and a `sh:agentInstruction` string describing its purpose. **All five shape file URLs return 404.**

### Shape catalogs — TWO of them
- `meta/shapes/` (the one advertised by storage description) is a 200 OK container with the description "wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working." but has **no `ldp:contains` and no children** — empty.
- `procedures/shapes/` (not advertised by storage description) contains exactly one shape: `concept-note.ttl` (2495 bytes).

### Profile / WebID
- `profile/card#me` is a `foaf:Person`.
- Declares `solid:oidcIssuer http://pod.vardeman.me:3000/`, `pim:storage <…/vault/>`, `solid:publicTypeIndex <…/vault/settings/publicTypeIndex>`.

### JSON-LD context (meta/context.jsonld)
Prefixes for `wiki, dct, skos, cito, foaf, prov, ldp, sh`. Aliases: `title→dct:title`, `extends→cito:extends`, `supports→cito:agreesWith`, `criticizes→cito:disagreesWith`, `Concept→wiki:Concept`, `Source→wiki:Source`, `Person→wiki:Person`, `Procedure→wiki:Procedure`, `WorkingNote→wiki:WorkingNote`, `Hub→wiki:Hub`, `maturity→wiki:maturity`.
