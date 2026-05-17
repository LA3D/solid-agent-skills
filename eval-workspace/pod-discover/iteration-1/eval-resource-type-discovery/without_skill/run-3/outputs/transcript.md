# HTTP Transcript — Pod Resource Type Discovery

Pod: `http://pod.vardeman.me:3000/vault/`
Date: 2026-05-15

## Requests

```
HEAD http://pod.vardeman.me:3000/vault/                                              [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/.well-known/solid                              [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/settings/publicTypeIndex                       [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/                              [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/shapes/                                   [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/context.jsonld                            [Accept: application/ld+json]    → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl       [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl                   [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl                  [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl           [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/wiki/pages/                                    [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/wiki/sources/                                  [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/wiki/people/                                   [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/wiki/procedures/                               [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/wiki/working/                                  [Accept: text/turtle]            → 200
HEAD http://pod.vardeman.me:3000/vault/resources/concepts/                            [Accept: */*]                    → 200
HEAD http://pod.vardeman.me:3000/vault/resources/theories/                            [Accept: */*]                    → 200
HEAD http://pod.vardeman.me:3000/vault/resources/literature/                          [Accept: */*]                    → 200
HEAD http://pod.vardeman.me:3000/vault/resources/methods/                             [Accept: */*]                    → 200
HEAD http://pod.vardeman.me:3000/vault/projects/                                      [Accept: */*]                    → 200
GET  http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl                     [Accept: text/turtle]            → 404
HEAD http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl                     [Accept: */*]                    → 404
GET  http://pod.vardeman.me:3000/vault/meta/shapes/                                   [Accept: application/ld+json]    → 200
GET  http://pod.vardeman.me:3000/vault/resources/concepts/                            [Accept: text/turtle]            → 200
GET  http://pod.vardeman.me:3000/vault/projects/                                      [Accept: text/turtle]            → 200
```

## Observations

### Root resource Link headers (HEAD /vault/)

Root advertises itself as `pim:Storage`, `pim:Workspace`, `ldp:Container`, `ldp:BasicContainer`. Key Link relations:

- `rel="type"`: `pim:Storage`, `pim:Workspace`, `ldp:Container`, `ldp:BasicContainer`, `ldp:Resource`
- `rel="timemap"`: `…/vault/?ext=timemap`
- `rel="timegate"`: `…/vault/` (origin doubles as TimeGate, RFC 7089 Pattern 1.1)
- `rel="describedby"`: `…/vault/.meta`
- `rel="http://www.w3.org/ns/solid/terms#storageDescription"`: **`…/vault/.well-known/solid`** — the spec-mandated entry point.
- `rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"`: streaming notifications endpoint.
- `Vary: accept-datetime` — advertises Memento per RFC 7089 §4.1.1.

### Storage description (/vault/.well-known/solid)

Pod declares itself `pim:Storage`, `void:Dataset`, `dcat:DataService`. Conforms to `fabric:CoreProfile` and `fabric:SolidPodProfile`. Declares vocabularies via `void:vocabulary` (six). Declares feature `fabric:LDPBrowse`. Critically, surfaces wiki-extension affordance catalog and shape catalog via custom `urn:example:wiki#` predicates and points (via `rdfs:seeAlso`) to five wiki containers.

### Type Index (/vault/settings/publicTypeIndex)

Five legacy `solid:TypeRegistration` entries (concepts/theories/literature/methods/projects) mapping classes to `solid:instanceContainer` URLs under `/vault/resources/*` and `/vault/projects/`.

### Wiki containers (`rdfs:seeAlso` targets)

Five containers — pages/sources/people/procedures/working. Each carries `urn:example:wiki#shape` linking to its SHACL shape, plus `sh:agentInstruction` describing how to use it. The container `.meta` is itself an affordance descriptor for that container's contents.

### Affordance descriptors

- `markdown-projection.ttl` → `wiki:WriteAffordance`. Lists 15 governed predicates (substrate writes these from body+frontmatter; agents shouldn't PATCH them directly).
- `memento.ttl` → `wiki:VersionAffordance`. Conforms to RFC 7089. `?ext=timemap` and `?version=<14-digit-datetime>` query patterns.
- `hub-view.ttl` → `wiki:DerivedClassAffordance`. CONSTRUCT query against `/sparql` materializes `wiki:Hub` for resources with ≥3 incoming `skos:broader` edges.
- `breadcrumb-view.ttl` → `wiki:DerivedNavigationAffordance`. SELECT-with-property-path walks `skos:broader+` to roots.

### Inconsistencies

- **Shape catalog is empty**: `/vault/meta/shapes/` advertises "Five shapes: page, source, person, procedure, working" in `dc:description`, and each wiki container's `.meta` points to a shape file (e.g., `../../meta/shapes/page.shacl.ttl`). But `GET /vault/meta/shapes/page.shacl.ttl` → **404**, and the container has no `ldp:contains` entries. The shape files are referenced but not deployed.
- **Two parallel resource-type vocabularies**: legacy Type Index uses `vault:TheoryNote`/`vault:LiteratureNote`/`vault:MethodNote`/`vault:Project` and `skos:Concept` under `/vault/resources/*` and `/vault/projects/`. The newer wiki layer uses `wiki:Concept`/`wiki:Source`/`wiki:Person`/`wiki:Procedure`/`wiki:WorkingNote` under `/wiki/*`. The two are not cross-referenced. Type Index has no entries for the wiki classes.
- The legacy containers exist (HEAD 200) but their listings show no `ldp:contains` for instance resources — they appear empty or contain only the container `.meta` and a `dc:type` of `vault:Symbolic`/`vault:Resources`/etc.

