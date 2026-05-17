# HTTP Transcript — Pod Discovery

## Request log

1. `HEAD http://pod.vardeman.me:3000/vault/` [no Accept] → 200 OK
2. `GET http://pod.vardeman.me:3000/vault/.well-known/solid` [Accept: text/turtle] → 200 OK
3. `GET http://pod.vardeman.me:3000/vault/meta/context.jsonld` [no Accept] → 200 OK
4. `GET http://pod.vardeman.me:3000/vault/meta/affordances/` [Accept: text/turtle] → 200 OK
5. `GET http://pod.vardeman.me:3000/vault/meta/affordances/markdown-projection.ttl` [no Accept] → 200 OK
6. `GET http://pod.vardeman.me:3000/vault/meta/affordances/breadcrumb-view.ttl` [no Accept] → 200 OK
7. `GET http://pod.vardeman.me:3000/vault/meta/affordances/memento.ttl` [no Accept] → 200 OK
8. `GET http://pod.vardeman.me:3000/vault/meta/affordances/hub-view.ttl` [no Accept] → 200 OK
9. `GET http://pod.vardeman.me:3000/vault/wiki/pages/` [Accept: text/turtle] → 200 OK
10. `GET http://pod.vardeman.me:3000/vault/wiki/sources/` [Accept: text/turtle] → 200 OK
11. `GET http://pod.vardeman.me:3000/vault/wiki/people/` [Accept: text/turtle] → 200 OK
12. `GET http://pod.vardeman.me:3000/vault/wiki/procedures/` [Accept: text/turtle] → 200 OK
13. `GET http://pod.vardeman.me:3000/vault/wiki/working/` [Accept: text/turtle] → 200 OK
14. `GET http://pod.vardeman.me:3000/vault/settings/publicTypeIndex` [Accept: text/turtle] → 200 OK
15. `GET http://pod.vardeman.me:3000/vault/meta/shapes/` [Accept: text/turtle] → 200 OK

## Observations

### (1) Root HEAD — key Link headers

```
Link: <http://pod.vardeman.me:3000/vault/.well-known/solid>;
      rel="http://www.w3.org/ns/solid/terms#storageDescription"
Link: <http://pod.vardeman.me:3000/vault/?ext=timemap>; rel="timemap"
Link: <http://pod.vardeman.me:3000/vault/>; rel="timegate"
Link: <http://pod.vardeman.me:3000/vault/.meta>; rel="describedby"
Link: <http://www.w3.org/ns/pim/space#Storage>; rel="type"
Vary: accept-datetime
```

Confirms RFC 7089 Memento advertisement (D67) is live on the root.

### (2) Storage description — full pointer set

```turtle
<../> a pim:Storage, void:Dataset, dcat:DataService ;
  dct:conformsTo fabric:CoreProfile, fabric:SolidPodProfile ;
  void:vocabulary skos:, dct:, prov:, vault-ontology:, wiki:, cito: ;
  void:feature fabric:LDPBrowse ;
  wiki:contextDocument <../meta/context.jsonld> ;
  wiki:shapeCatalog    <../meta/shapes/> ;
  wiki:affordanceCatalog <../meta/affordances/> ;
  wiki:typeIndex <../settings/publicTypeIndex> ;
  wiki:conformsTo wiki:L3Profile ;
  rdfs:seeAlso <../wiki/{pages,sources,people,procedures,working}/> .
```

The storage description is the spec-mandated router (D44). Note `void:vocabulary` appears twice (lines split standard W3C from wiki+cito) — semantically additive, syntactically a minor wart.

### (3) Context document

Short-form predicate aliases: `extends → cito:extends`, `supports → cito:agreesWith`, `criticizes → cito:disagreesWith`. Confirms hybrid-vocab stance (D79).

### (4) Affordance catalog (4 descriptors)

- `markdown-projection.ttl` — `wiki:WriteAffordance`. Lists 14 governed predicates (D81 Model A): `rdf:type, dct:title, dct:identifier, dct:created, dct:modified, dct:references, dct:subject, dct:contributor, dct:creator, skos:broader, skos:related, cito:extends, cito:agreesWith, cito:disagreesWith, wiki:maturity, prov:wasGeneratedBy`. Frontmatter keys projected: `type, created, modified, maturity, aliases, identifier, citekey`.
- `breadcrumb-view.ttl` — `wiki:DerivedNavigationAffordance`. `wiki:targetClass wiki:Resource`, invoked at `/sparql`, walks `skos:broader+` chain.
- `memento.ttl` — `wiki:VersionAffordance` conforming to RFC 7089. `?ext=timemap` and `?version=<14-digit-datetime>`.
- `hub-view.ttl` — `wiki:DerivedClassAffordance`. Threshold N=3 incoming `skos:broader` edges promote to `wiki:Hub`.

### (5) Container `.meta` sh:agentInstruction excerpts

- `/wiki/pages/` → "General wiki content … Shape: wiki:PageShape (permissive). dct:title, skos:broader, skos:related."
- `/wiki/sources/` → "Citation records … Shape: wiki:SourceShape. dct:identifier required. cito:extends/agreesWith/disagreesWith."
- `/wiki/people/` → "Shape: wiki:PersonShape. FOAF-based with foaf:nick for aliases."
- `/wiki/procedures/` → "Shape: wiki:ProcedureShape. sh:agentInstruction on .meta carries procedure body."
- `/wiki/working/` → "Permissive working memory (D73). Use mem:Crystallize to promote."

Each container also declares `wiki:shape <../../meta/shapes/<name>.shacl.ttl>` — but those files don't exist (see gap below).

### (6) Type Index drift (known gap)

`/vault/settings/publicTypeIndex` is still Phase 2 PARA-era: registers `skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project` against `/vault/resources/{concepts,theories,literature,methods}/` and `/vault/projects/`. Does NOT register the 5 wiki classes.

### (7) Shape catalog empty (known gap)

`/vault/meta/shapes/` container exists with title "SHACL Shape Catalog" and description naming the 5 shapes, but has no `ldp:contains` and no shape files. The container `.meta` files reference shape URLs (e.g. `<../../meta/shapes/page.shacl.ttl>`) that would 404 if fetched. Class-level `sh:agentInstruction` on container `.meta` carries the load-bearing guidance instead.
