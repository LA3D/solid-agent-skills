# Pod Resource Type Discovery — `http://pod.vardeman.me:3000/vault/`

## 1. Discovery Path

I followed the spec-mandated entry chain: root → storage description → catalogs → individual descriptors and containers.

| # | Method | URL | Accept | Status | What I learned |
|---|--------|-----|--------|--------|----------------|
| 1 | HEAD | `/vault/` | `text/turtle` | 200 | Root is `pim:Storage`. Link headers expose storage description (`solid:storageDescription` rel), Memento (`timemap`/`timegate`/`Vary: accept-datetime`), description sidecar (`describedby` → `.meta`), and streaming notifications channel. This is where the spec-mandated discovery starts. |
| 2 | GET | `/vault/.well-known/solid` | `text/turtle` | 200 | The storage description. Pod typed as `pim:Storage`, `void:Dataset`, `dcat:DataService`. Six `void:vocabulary` declarations. `fabric:LDPBrowse` feature flag. **Routes to four discoverable catalogs**: `meta/context.jsonld`, `meta/shapes/`, `meta/affordances/`, `settings/publicTypeIndex`. Five `rdfs:seeAlso` targets under `/wiki/*`. Conforms to `fabric:CoreProfile`, `fabric:SolidPodProfile`, `wiki:L3Profile`. |
| 3 | GET | `/vault/settings/publicTypeIndex` | `text/turtle` | 200 | Five `solid:TypeRegistration` entries mapping legacy classes to instance containers under `/resources/*` and `/projects/`. |
| 4 | GET | `/vault/meta/affordances/` | `text/turtle` | 200 | Container listing four affordance descriptors. |
| 5 | GET | `/vault/meta/shapes/` | `text/turtle` | 200 | Container `.meta` advertises "Five shapes: page, source, person, procedure, working" — but `ldp:contains` is empty (see inconsistencies). |
| 6 | GET | `/vault/meta/context.jsonld` | `application/ld+json` | 200 | JSON-LD context — prefix→IRI registry. Aliases short terms to W3C standard predicates (`extends`→`cito:extends`, `supports`→`cito:agreesWith`, `criticizes`→`cito:disagreesWith`, etc.) and to seven `wiki:*` types. |
| 7-10 | GET | `/vault/meta/affordances/{markdown-projection,memento,hub-view,breadcrumb-view}.ttl` | `text/turtle` | 200 | Four affordance descriptors with `sh:agentInstruction` strings telling agents how to invoke each. |
| 11-15 | GET | `/vault/wiki/{pages,sources,people,procedures,working}/` | `text/turtle` | 200 | Each container `.meta` carries a `urn:example:wiki#shape` pointer to its SHACL shape plus an `sh:agentInstruction` describing the container's role. |
| 16-20 | HEAD | `/vault/resources/{concepts,theories,literature,methods}/` and `/vault/projects/` | — | 200 | Legacy Type Index containers all exist. |
| 21 | GET | `/vault/meta/shapes/page.shacl.ttl` | `text/turtle` | **404** | Shape file referenced by `wiki/pages/.meta` is not deployed (see inconsistencies). |

## 2. Resource Types

The Pod exposes **two parallel type vocabularies** that are not cross-referenced.

### A. Wiki-memory L3 types (newer; declared via `rdfs:seeAlso` from storage description + per-container `.meta` + JSON-LD context)

| RDF class | Container URL | Shape (referenced) | Agent guidance |
|-----------|---------------|--------------------|----------------|
| `wiki:Concept` (and general wiki:Resource) | `http://pod.vardeman.me:3000/vault/wiki/pages/` | `…/meta/shapes/page.shacl.ttl` *(404)* | "General wiki content (concepts, MOCs, theory notes, daily notes). Permissive `wiki:PageShape`. Use `dct:title`, `skos:broader`, `skos:related`." |
| `wiki:Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | `…/meta/shapes/source.shacl.ttl` *(404)* | "Citation records. `wiki:SourceShape`. `dct:identifier` required (DOI/arXiv/citekey). Use `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`." |
| `wiki:Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` | `…/meta/shapes/person.shacl.ttl` *(404)* | "Person records. `wiki:PersonShape`. FOAF-based; `foaf:nick` aliases citekey/display-name variants." |
| `wiki:Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `…/meta/shapes/procedure.shacl.ttl` *(404)* | "Procedural memory: agent instructions, workflows, skills. `wiki:ProcedureShape`. `sh:agentInstruction` on `.meta` carries the procedure body." |
| `wiki:WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | `…/meta/shapes/working.shacl.ttl` *(404)* | "Low-ceremony working memory (D73). Permissive. Use `mem:Crystallize` to promote." |
| `wiki:Hub` | *derived view* (CONSTRUCT against `/sparql`) | n/a | Computed: any `wiki:Resource` with ≥3 incoming `skos:broader` edges. |

### B. Legacy types (older; declared via Type Index)

| RDF class | Container URL |
|-----------|----------------|
| `skos:Concept` | `http://pod.vardeman.me:3000/vault/resources/concepts/` |
| `vault:TheoryNote` | `http://pod.vardeman.me:3000/vault/resources/theories/` |
| `vault:LiteratureNote` | `http://pod.vardeman.me:3000/vault/resources/literature/` |
| `vault:MethodNote` | `http://pod.vardeman.me:3000/vault/resources/methods/` |
| `vault:Project` | `http://pod.vardeman.me:3000/vault/projects/` |

The legacy containers respond 200 to HEAD/GET but appear to contain no resource instances — only their `.meta` self-description.

## 3. Vocabularies Declared

From `/vault/.well-known/solid` (`void:vocabulary`):

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (DCT / Dublin Core Terms)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `https://pod.vardeman.me/vault/ontology#` (local `vault:` ontology)
- `urn:example:wiki#` (local `wiki:` namespace — placeholder, D79)
- `http://purl.org/spar/cito/` (CITO citation typing)

Additional vocabularies appearing throughout the discovered RDF (not formally declared in `void:vocabulary` but in active use):

- `http://www.w3.org/ns/ldp#` (LDP)
- `http://www.w3.org/ns/solid/terms#` (Solid terms / Type Index)
- `http://www.w3.org/ns/pim/space#` (PIM Workspace/Storage)
- `http://www.w3.org/ns/shacl#` (SHACL — for `sh:agentInstruction`)
- `http://xmlns.com/foaf/0.1/` (FOAF — surfaced via JSON-LD context)
- `http://rdfs.org/ns/void#` (VoID)
- `http://www.w3.org/ns/dcat#` (DCAT)
- `http://www.w3.org/2000/01/rdf-schema#`, `http://www.w3.org/1999/02/22-rdf-syntax-ns#`
- `https://w3id.org/cogitarelink/fabric#` (Fabric profile)

## 4. Substrate Affordances

Discovered via `/vault/meta/affordances/`. The Pod advertises four affordance descriptors plus the legacy SHACL guidance on containers:

### 4.1 `wiki:WriteAffordance` — Markdown projection listener
- **URI**: `/vault/meta/affordances/markdown-projection.ttl`
- **What it does**: Substrate-managed projection from markdown body + YAML frontmatter into `.meta` triples. Listener writes (and exclusively owns) 15 governed predicates: `rdf:type`, `dct:{title,identifier,created,modified,references,subject,contributor,creator}`, `skos:{broader,related}`, `cito:{extends,agreesWith,disagreesWith}`, `wiki:maturity`, `prov:wasGeneratedBy`.
- **Agent contract**: To express any governed predicate, edit body+frontmatter — do NOT PATCH `.meta` directly. Other predicates are agent-extensible (Model A predicate-level governance, D81).
- **Class-hint table**: `meta/context.jsonld` (resolves `[[Note]]{.class}` to predicates).

### 4.2 `wiki:VersionAffordance` — RFC 7089 Memento time-travel
- **URI**: `/vault/meta/affordances/memento.ttl`
- **What it does**: Every resource has time-travel via query-string convention. `…?ext=timemap` for TimeMap; `…?version=<14-digit-datetime>` for a specific Memento. OriginalResource doubles as TimeGate (Pattern 1.1).
- **Surfaced at HTTP layer**: `Vary: accept-datetime` + `Link: rel="timemap"` + `Link: rel="timegate"` on every resource (confirmed on `/vault/` HEAD).

### 4.3 `wiki:DerivedClassAffordance` — Hub derivation
- **URI**: `/vault/meta/affordances/hub-view.ttl`
- **What it does**: Materializes `wiki:Hub` membership for any `wiki:Resource` with ≥3 incoming `skos:broader` edges. Invoked on-demand at `/sparql` via CONSTRUCT query embedded in the descriptor.

### 4.4 `wiki:DerivedNavigationAffordance` — Breadcrumb chain
- **URI**: `/vault/meta/affordances/breadcrumb-view.ttl`
- **What it does**: Given a starting resource, walks `skos:broader+` to roots and returns the ordered ancestor chain. SELECT query embedded in the descriptor.

### Other substrate behaviors observed
- **Storage description as router (D44)**: `.well-known/solid` is a thin index that points at catalog containers — it does not embed everything inline.
- **Streaming notifications**: `rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"` Link on `/vault/` points at `/.notifications/StreamingHTTPChannel2023/…`.
- **Per-container `sh:agentInstruction`**: every container `.meta` carries an instruction string telling agents what queries/predicates to use — discoverable affordance without per-container code.

## 5. Inconsistencies and Surprises

1. **Shape catalog is empty.** `/vault/meta/shapes/` describes itself as holding five shapes and every wiki container's `.meta` carries a `wiki:shape` link to `…/meta/shapes/{page,source,person,procedure,working}.shacl.ttl`. But the container has no `ldp:contains` entries, and `GET …/meta/shapes/page.shacl.ttl` → 404. Conformance gap: shape references resolve to nowhere, so SHACL-driven validation/generation against this Pod will fail.

2. **Two parallel resource-type vocabularies coexist without cross-references.** The legacy Type Index registers five `vault:*` and `skos:Concept` classes under `/vault/resources/*` and `/vault/projects/`. The newer `wiki:*` taxonomy under `/vault/wiki/*` is only discoverable via storage-description `rdfs:seeAlso` — not via Type Index. Type Index entries for `wiki:Concept`, `wiki:Source`, `wiki:Person`, `wiki:Procedure`, `wiki:WorkingNote` are missing. An agent following only the Solid spec (Type Index) will miss the wiki layer entirely; an agent following only the storage description's `seeAlso` set will miss the legacy classes.

3. **Legacy containers exist but appear unpopulated.** All five legacy Type Index containers return 200 but their listings show only container metadata (`dc:description`, `dc:type`, `sh:agentInstruction`) and no `ldp:contains` for instance resources. The Pod has structure but minimal sample data.

4. **`urn:example:wiki#` namespace is a placeholder.** The Pod's primary type vocabulary uses a literal `urn:example:wiki#` IRI prefix — non-dereferenceable by design (D79). Agents cannot follow-your-nose from `wiki:Concept` to a vocabulary definition; they must consult `meta/context.jsonld` for the alias mapping.

5. **Custom `urn:example:wiki#` predicates appear in the storage description.** `contextDocument`, `shapeCatalog`, `affordanceCatalog`, `typeIndex`, `conformsTo`, `seeAlso`-anchored navigation targets are surfaced via local predicates rather than via standard `solid:storageDescription`/`solid:typeIndex` slots. Useful, but a spec-only agent will not recognize them.

6. **VoID vocabulary declarations split across two `void:vocabulary` statements.** Not invalid (RDF triples coalesce), but stylistically surprising — six vocabs split across two predicates in the same subject block. Trivial.

7. **`Allow: OPTIONS, HEAD, GET, POST`** on the root — no PUT/PATCH/DELETE advertised at the storage root (write affordances are container-level only, as expected for a `pim:Storage`).
