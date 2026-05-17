# HTTP Transcript — Pod Resource-Type Discovery

## Requests

```
HEAD  http://pod.vardeman.me:3000/vault/                                 [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/.well-known/solid                [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/settings/publicTypeIndex         [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/meta/affordances/                [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl [Accept: text/turtle]    → 200
GET   http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl     [Accept: text/turtle]    → 200
GET   http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl             [Accept: text/turtle]    → 200
GET   http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl            [Accept: text/turtle]    → 200
GET   http://pod.vardeman.me:3000/vault/meta/shapes/                     [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/meta/context.jsonld              [Accept: application/ld+json]   → 200
HEAD  http://pod.vardeman.me:3000/vault/meta/shapes/page.shacl.ttl       [Accept: text/turtle]            → 404
HEAD  http://pod.vardeman.me:3000/vault/meta/shapes/source.shacl.ttl     [Accept: text/turtle]            → 404
HEAD  http://pod.vardeman.me:3000/vault/meta/shapes/person.shacl.ttl     [Accept: text/turtle]            → 404
HEAD  http://pod.vardeman.me:3000/vault/meta/shapes/procedure.shacl.ttl  [Accept: text/turtle]            → 404
HEAD  http://pod.vardeman.me:3000/vault/meta/shapes/working.shacl.ttl    [Accept: text/turtle]            → 404
GET   http://pod.vardeman.me:3000/vault/wiki/pages/                      [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/wiki/sources/                    [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/wiki/people/                     [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/wiki/procedures/                 [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/wiki/working/                    [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/resources/concepts/              [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/resources/theories/              [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/resources/literature/            [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/resources/methods/               [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/projects/                        [Accept: text/turtle]            → 200
HEAD  http://pod.vardeman.me:3000/vault/resources/                       [Accept: text/turtle]            → 200
GET   http://pod.vardeman.me:3000/vault/.meta                            [Accept: text/turtle]            → 200
```

## Observations

### Root container `/vault/` (HEAD)

Key Link headers:

- `<http://www.w3.org/ns/pim/space#Storage>; rel="type"` — this is a Pod root
- `<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"` — LDP container
- `<http://pod.vardeman.me:3000/vault/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"` — storage description (router)
- `<http://pod.vardeman.me:3000/vault/?ext=timemap>; rel="timemap"` — Memento TimeMap (RFC 7089)
- `<http://pod.vardeman.me:3000/vault/>; rel="timegate"` — Memento TimeGate (Pattern 1.1)
- `<http://pod.vardeman.me:3000/vault/.meta>; rel="describedby"` — sidecar metadata
- `Vary: accept-datetime` — datetime negotiation
- `Updates-Via` / streaming notifications channel advertised

### Storage description `/vault/.well-known/solid`

```turtle
<../> a pim:Storage, void:Dataset, dcat:DataService ;
    dct:conformsTo fabric:CoreProfile, fabric:SolidPodProfile ;
    void:vocabulary skos:, dct:, prov:, vault:, urn:example:wiki#, cito: ;
    void:feature fabric:LDPBrowse ;
    wiki:contextDocument </vault/meta/context.jsonld> ;
    wiki:shapeCatalog </vault/meta/shapes/> ;
    wiki:affordanceCatalog </vault/meta/affordances/> ;
    wiki:typeIndex </vault/settings/publicTypeIndex> ;
    wiki:conformsTo wiki:L3Profile ;
    rdfs:seeAlso </vault/wiki/pages/>, </vault/wiki/sources/>,
                 </vault/wiki/people/>, </vault/wiki/procedures/>,
                 </vault/wiki/working/> .
```

### Type Index `/vault/settings/publicTypeIndex`

Five `solid:TypeRegistration` entries pairing an RDF class with `solid:instanceContainer`:

- `skos:Concept` → `/vault/resources/concepts/`
- `vault:TheoryNote` → `/vault/resources/theories/`
- `vault:LiteratureNote` → `/vault/resources/literature/`
- `vault:MethodNote` → `/vault/resources/methods/`
- `vault:Project` → `/vault/projects/`

### Affordance catalog `/vault/meta/affordances/`

Container lists four `.ttl` descriptors:

1. **markdown-projection** (`wiki:WriteAffordance`) — substrate-governed predicates listed under `wiki:governs`: `rdf:type, dct:title, dct:identifier, dct:created, dct:modified, dct:references, dct:subject, dct:contributor, dct:creator, skos:broader, skos:related, cito:extends, cito:agreesWith, cito:disagreesWith, wiki:maturity, prov:wasGeneratedBy`. Other predicates are agent-extensible. Projects from frontmatter: `type, created, modified, maturity, aliases, identifier, citekey`.
2. **breadcrumb-view** (`wiki:DerivedNavigationAffordance`) — SPARQL CONSTRUCT over `skos:broader+` invoked at `/sparql`.
3. **memento** (`wiki:VersionAffordance`) — `?ext=timemap` for TimeMap, `?version=<14-digit-datetime>` for a specific Memento; conforms to RFC 7089 Pattern 1.1.
4. **hub-view** (`wiki:DerivedClassAffordance`) — derives `wiki:Hub` for any `wiki:Resource` with ≥3 incoming `skos:broader` references.

### Wiki containers (from `rdfs:seeAlso`)

Each carries `wiki:shape` pointing to `/vault/meta/shapes/<n>.shacl.ttl` and an `sh:agentInstruction`:

- `/vault/wiki/pages/` — `wiki:PageShape` (permissive). General wiki content (concepts, MOCs, theory, daily).
- `/vault/wiki/sources/` — `wiki:SourceShape`. Citation records; `dct:identifier` required (DOI, arXiv ID, citekey); typed citation via `cito:extends/agreesWith/disagreesWith`.
- `/vault/wiki/people/` — `wiki:PersonShape`. FOAF-based; `foaf:nick` carries aliases/citekey patterns.
- `/vault/wiki/procedures/` — `wiki:ProcedureShape`. Procedural memory; `sh:agentInstruction` on `.meta` carries the body.
- `/vault/wiki/working/` — `wiki:WorkingMemoryShape` (permissive). D73 two-stage commit; `mem:Crystallize` to promote.

### Inconsistencies

1. **Shape catalog is empty** — `/vault/meta/shapes/` returns a valid container but its `ldp:contains` is empty, and every individual shape file referenced by wiki container `.meta` (`page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl`) returns **404**. The Pod advertises shapes via `wiki:shapeCatalog` and per-container `wiki:shape` links, but the actual shape resources are not served. Agents that need shape-driven validation cannot resolve them.
2. **Two parallel type registries** — Type Index lists a *legacy* set (`skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project` under `/vault/resources/*` + `/vault/projects/`), while the storage description's `rdfs:seeAlso` points to the *new* L3 surface (`/vault/wiki/{pages,sources,people,procedures,working}/`). The Type Index has not been updated to reference the wiki containers.
3. **Root container lists 10 children** (from `.meta`): `resources/, ontology/, wiki/, settings/, areas/, procedures/, profile/, projects/, archive/, meta/`. `areas/`, `archive/`, `ontology/`, `procedures/` (note the top-level one vs. `wiki/procedures/`), and `profile/` are not declared as instance containers in either the Type Index or the L3 `seeAlso` list — they exist but their resource types are undocumented at the discovery layer.
