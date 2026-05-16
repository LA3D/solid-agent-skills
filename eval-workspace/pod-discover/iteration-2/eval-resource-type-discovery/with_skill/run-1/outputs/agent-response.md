# Pod Discovery Report — `http://pod.vardeman.me:3000/vault/`

## 1. Discovery path

| # | Method | URL | Accept | Status | What it told me |
|---|---|---|---|---|---|
| 1 | HEAD | `http://pod.vardeman.me:3000/vault/` | — | 200 | Link headers: `describedby` → `/vault/.meta`; `storageDescription` → `/vault/.well-known/solid`; `timemap` → `/vault/?ext=timemap`; `timegate` → `/vault/`. |
| 2 | GET | `http://pod.vardeman.me:3000/vault/.well-known/solid` | `text/turtle` | **501** | `NotImplementedHttpError` — "Only supports descriptions of storage containers." The advertised storage-description slot does not serve content. |
| 3 | GET | `http://pod.vardeman.me:3000/vault/.meta` | `text/turtle` | 200 | The de facto storage description. Declares `/vault/` as `pim:Storage` + `void:Dataset` + `dcat:DataService`; conformsTo fabric `CoreProfile` + `SolidPodProfile`; `void:vocabulary` (SKOS, DCT, PROV, capability, overlay); `cap:catalog` → `meta/capabilities/`; `ldp:contains` → `ontology/`, `wiki/`, `settings/`, `profile/`, `meta/`. |
| 4 | GET | `http://pod.vardeman.me:3000/.well-known/solid` | `text/turtle` | **501** | Root-level well-known also unimplemented. |
| 5 | GET | `http://pod.vardeman.me:3000/vault/meta/capabilities/` | `text/turtle` | 200 | Lists `derived-view.ttl`, `markdown-content-projection.ttl`, `time-travel.ttl` — substrate-implementation level. |
| 6 | GET | `http://pod.vardeman.me:3000/vault/wiki/` | `text/turtle` | 200 | "Wiki-memory L2 application root"; `ldp:contains` → `pages/`, `sources/`, `people/`, `procedures/`, `working/`. |
| 7 | GET | `http://pod.vardeman.me:3000/vault/meta/` | `text/turtle` | 200 | `ldp:contains` → `capabilities/`, `context.jsonld`, `shapes/`, `affordances/`. |
| 8 | GET | `http://pod.vardeman.me:3000/vault/meta/context.jsonld` | default | 200 | Canonical JSON-LD context. Prefix registry + short-form predicate/class aliases. |
| 9 | GET | `http://pod.vardeman.me:3000/vault/meta/affordances/` | `text/turtle` | 200 | Affordance catalog: 4 descriptors. |
| 10 | GET | `http://pod.vardeman.me:3000/vault/meta/shapes/` | `text/turtle` | 200 | SHACL shape catalog: 5 shape files (page/source/person/procedure/working). |
| 11–15 | GET | `http://pod.vardeman.me:3000/vault/wiki/{pages,sources,people,procedures,working}/.meta` | `text/turtle` | 200 ×5 | Each carries `solid:forClass` → `wiki:<Class>` + `wiki:shape` → corresponding `.shacl.ttl` + class-level `sh:agentInstruction`. |
| 16–19 | GET | `http://pod.vardeman.me:3000/vault/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` | `text/turtle` | 200 ×4 | Each affordance descriptor with its `sh:agentInstruction`, `wiki:requiresCapability`, and class-specific predicates. |

## 2. Resource types and containers

The Pod's wiki-memory L3 surface holds five resource classes; each container declares `solid:forClass <class-IRI>` in its `.meta`:

| Class IRI | Container URL | `solid:forClass` declared | Notes |
|---|---|---|---|
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Page` | `http://pod.vardeman.me:3000/vault/wiki/pages/` | yes | General wiki content; instances may declare subclass `wiki:Page` / `wiki:Concept` / `wiki:MOC` (and future vault-specific subclasses like `vault:TheoryNote`). Use `dct:title`, `skos:broader`, `skos:related`. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | yes | Citation records (literature, papers, reports). `dct:identifier` required (DOI/arXiv/citekey); CITO predicates `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` | yes | FOAF-based. `foaf:name` preferred over `dct:title`; `foaf:nick` carries aliases (citekey patterns, social handles). |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | yes | Procedural memory: instructions, workflows, skills. Body markdown is the procedure documentation. |
| `http://pod.vardeman.me:3000/vault/ontology/wiki#WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | yes | Low-ceremony working memory per D73. Permissive shape; promotable via `mem:Crystallize` (deferred). |

A latent derived class also appears (not a container — produced by an affordance):

- `http://pod.vardeman.me:3000/vault/ontology/wiki#Hub` — derived from `wiki:Resource` instances with ≥3 incoming `skos:broader` edges. Produced by the `hub-view` derived-class affordance; not stored.

JSON-LD context short-forms (resolve to the same IRIs above): `Page`, `Concept`, `MOC`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub`.

## 3. Vocabularies declared

The Pod's `void:vocabulary` declarations on `/vault/.meta`:

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (DCT)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `http://pod.vardeman.me:3000/vault/ontology/capability#` (local — `cap:` capability vocabulary)
- `http://pod.vardeman.me:3000/vault/ontology/overlay#` (local — overlay/installer vocabulary)

Additional vocabularies in active use across the Pod (referenced by `.meta`, affordances, and the JSON-LD context, but **not** appearing in `void:vocabulary`):

- `http://pod.vardeman.me:3000/vault/ontology/wiki#` (local — `wiki:` core vocabulary)
- `http://purl.org/spar/cito/` (CITO)
- `http://xmlns.com/foaf/0.1/` (FOAF)
- `http://www.w3.org/ns/shacl#` (SHACL)
- `http://www.w3.org/ns/ldp#` (LDP)
- `http://www.w3.org/ns/pim/space#` (PIM Space — `pim:Storage`)
- `http://www.w3.org/ns/dcat#` (DCAT — `dcat:DataService`)
- `http://rdfs.org/ns/void#` (VoID)
- `http://www.w3.org/ns/solid/terms#` (Solid terms — `solid:forClass`, `solid:storageDescription`)
- `https://w3id.org/cogitarelink/fabric#` (fabric — `CoreProfile`, `SolidPodProfile`, `LDPBrowse` feature)

`dct:conformsTo` declares profile membership in `fabric:CoreProfile` and `fabric:SolidPodProfile`.

## 4. Substrate affordances

The affordance catalog at `http://pod.vardeman.me:3000/vault/meta/affordances/` lists 4 descriptors:

| Affordance URL | Type | Behavior |
|---|---|---|
| `…/affordances/markdown-projection.ttl` | `wiki:WriteAffordance` | **Write-time projection.** Substrate writes the predicates listed in `wiki:governs` from body+frontmatter (D81 Model A). Governed predicates: `rdf:type`, `dct:title`, `dct:identifier`, `dct:created`, `dct:modified`, `dct:references`, `dct:subject`, `dct:contributor`, `dct:creator`, `skos:broader`, `skos:related`, `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Frontmatter keys projected: type, created, modified, maturity, aliases, identifier, citekey. Requires capability `markdown-content-projection.ttl`. Do not PATCH governed predicates directly on `.meta`; edit body+frontmatter instead. |
| `…/affordances/memento.ttl` | `wiki:VersionAffordance` | **RFC 7089 time-travel.** Append `?ext=timemap` to any resource URL for its TimeMap; `?version=<14-digit-datetime>` for a specific Memento. RFC 7089 Pattern 1.1 — OriginalResource doubles as TimeGate. (D61.) |
| `…/affordances/breadcrumb-view.ttl` | `wiki:DerivedNavigationAffordance` | **Breadcrumb walk.** Carries a SELECT walking `skos:broader+` from a `START` IRI. Agent-side query (Pod hosts no SPARQL endpoint). |
| `…/affordances/hub-view.ttl` | `wiki:DerivedClassAffordance` | **Hub derivation.** A `wiki:Resource` becomes a `wiki:Hub` when ≥3 distinct `wiki:Resource` instances point at it via `skos:broader`. `wiki:threshold 3`. Agent runs CONSTRUCT client-side over the wiki containers. |

Each affordance has `wiki:requiresCapability` pointing into `/vault/meta/capabilities/` (`markdown-content-projection.ttl`, `time-travel.ttl`, or `derived-view.ttl`). The capability layer is a second tier under affordances — not explicitly mentioned in the skill text.

## 5. Inconsistencies, 404s, and surprises

- **501 on the storage description.** The Pod root advertises `Link rel="…#storageDescription"` → `/vault/.well-known/solid`, but `GET .well-known/solid` returns **501 NotImplementedHttpError** ("Only supports descriptions of storage containers"). Root-level `/.well-known/solid` is also 501. The actual storage-description content lives in `/vault/.meta` (reached via `Link rel="describedby"`). This contradicts the skill's "Step 2" path and means the discovery chain has to fall back to the `describedby` slot.
- **No `wiki:contextDocument` / `wiki:affordanceCatalog` / `wiki:typeIndex` / `wiki:shapeCatalog` pointers.** The skill's quick-reference table lists these as the predicates a storage description uses to point at catalogs. None appear in `/vault/.meta`. The only catalog pointer present is `cap:catalog` → `meta/capabilities/`. The affordance / shape / context resources are discovered by listing `/vault/meta/` (which contains all four as children).
- **`void:vocabulary` under-declares.** Only SKOS, DCT, PROV, and two local namespaces are in `void:vocabulary`. The Pod actually uses CITO, FOAF, SHACL, PIM, DCAT, LDP, Solid terms, fabric, and `wiki:` itself — none declared in `void:vocabulary`. The JSON-LD context picks up part of the gap but not all of it.
- **Shape catalog is populated, contradicting the skill's "Known substrate gap."** The skill says `meta/shapes/` is empty at Rung 1.4; in this run all 5 shape files (`page.shacl.ttl`, `source.shacl.ttl`, `person.shacl.ttl`, `procedure.shacl.ttl`, `working.shacl.ttl`) are present.
- **Type Index not advertised at all.** No `wiki:typeIndex`, no `solid:typeIndex`, no Link to `publicTypeIndex` from the Pod root or `.meta`. Class routing is recovered from each container's `solid:forClass` + `sh:agentInstruction` directly — which works, but is a different mechanism from the skill's "Type Index does double duty" framing (D78).
- **No SPARQL endpoint.** Two derived-view affordances (`hub-view`, `breadcrumb-view`) both say explicitly "the Pod does not host a SPARQL endpoint. Run the query in your own SPARQL engine pointed at this Pod's wiki containers." The eval-task harness needs Comunica or similar to use these affordances.
- **Two-tier substrate model surfaces.** The skill describes "affordances." The Pod actually has affordances (`/vault/meta/affordances/`) PLUS a capabilities layer (`/vault/meta/capabilities/`) referenced via `wiki:requiresCapability`. Affordances = what the agent sees; capabilities = the substrate implementations they depend on.
- **Wiki-memory installed by an overlay.** Multiple resources (`/vault/wiki/.meta`, each container `.meta`, each affordance) carry `wiki:installedBy <…/ontology/overlay#wiki-memory>`. This suggests an overlay/installer pattern: wiki-memory is one installable L3 overlay rather than baked-in substrate.
