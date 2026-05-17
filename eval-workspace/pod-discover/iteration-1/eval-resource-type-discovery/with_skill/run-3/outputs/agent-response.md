# Pod Resource-Type Discovery — http://pod.vardeman.me:3000/vault/

## 1. Discovery path

| Step | Request | Status | Learned |
|---|---|---|---|
| 1 | `HEAD /vault/` | 200 | Pod root advertises types (`pim:Storage`, `pim:Workspace`, `ldp:BasicContainer`), Memento (`Link rel="timemap"`, `rel="timegate"`, `Vary: accept-datetime`), describedby pointer to `/vault/.meta`, and the **spec-mandated storage description** at `/vault/.well-known/solid` via `Link rel="http://www.w3.org/ns/solid/terms#storageDescription"`. |
| 2 | `GET /vault/.well-known/solid` (Accept: text/turtle) | 200 | Storage description for `<../>` (the Pod root). Declares 6 `void:vocabulary` IRIs, 4 catalog pointers (`wiki:contextDocument`, `wiki:shapeCatalog`, `wiki:affordanceCatalog`, `wiki:typeIndex`), and 5 `rdfs:seeAlso` wiki containers. Declares `void:feature wiki:LDPBrowse` and `dct:conformsTo` `fabric:CoreProfile`, `fabric:SolidPodProfile`, plus `wiki:L3Profile`. |
| 3 | `GET /vault/meta/affordances/` (Accept: text/turtle) | 200 | LDP container with `ldp:contains` 4 descriptors: `markdown-projection.ttl`, `breadcrumb-view.ttl`, `memento.ttl`, `hub-view.ttl`. |
| 4 | `GET /vault/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` | 200×4 | Each descriptor declares an `rdf:type` (`wiki:WriteAffordance`, `wiki:DerivedNavigationAffordance`, `wiki:VersionAffordance`, `wiki:DerivedClassAffordance`) and an `sh:agentInstruction` prose hint. Substrate-managed predicate sets and SPARQL CONSTRUCT bodies for derived classes are inline. |
| 5 | `GET /vault/meta/context.jsonld` | 200 | JSON-LD prefix→IRI registry. 8 prefixes (`wiki`, `dct`, `skos`, `cito`, `foaf`, `prov`, `ldp`, `sh`), 11 predicate aliases, 7 class aliases (`Concept`, `Source`, `Person`, `Procedure`, `WorkingNote`, `Hub`, `maturity`). |
| 6 | `GET /vault/wiki/{pages,sources,people,procedures,working}/.meta` (Accept: text/turtle) ×5 | 200×5 | Each container `.meta` carries `wiki:shape` pointer to the (notional) shape file plus `sh:agentInstruction` prose declaring the shape name and predicate-usage guidance. |
| 7 | `GET /vault/meta/shapes/` (Accept: text/turtle) | 200 | Container resolves with title "SHACL Shape Catalog" and description "wiki-memory L3 SHACL shapes (D77). Five shapes: page, source, person, procedure, working." — but the `ldp:contains` set is **empty**. |
| 8 | `HEAD /vault/meta/shapes/page.shacl.ttl`, `HEAD .../source.shacl.ttl` | 404, 404 | Confirms documented gap: shape files referenced by container `.meta` are not deployed. |
| 9 | `GET /vault/settings/publicTypeIndex` (Accept: text/turtle) | 200 | Type Index registers Phase 2 PARA-era classes (`skos:Concept`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) pointing at `/vault/resources/*` and `/vault/projects/`. **Does NOT register any `wiki:*` class.** |
| 10 | `HEAD /vault/resources/concepts/` | 200 | Confirms the Phase 2 PARA container chain still exists alongside the new `/vault/wiki/*` containers. |
| 11 | `GET /vault/wiki/pages/` (Accept: text/turtle) | 200 | Sanity check — container resolves as ldp:BasicContainer; same agentInstruction as its `.meta`. |

## 2. Resource types

The Pod advertises **two parallel typing systems** that have not been reconciled.

### A. Wiki-memory L3 typing (current, declared by storage description + container `.meta`)

| Class (wiki:*) | JSON-LD short | Container | Shape (notional, 404) | Guidance |
|---|---|---|---|---|
| `wiki:Page` (≈ `wiki:Concept` per JSON-LD `Concept` alias) | `Concept` | `http://pod.vardeman.me:3000/vault/wiki/pages/` | `wiki:PageShape` (page.shacl.ttl) | General wiki content (concepts, MOCs, theory notes, daily notes). Permissive. `dct:title`, `skos:broader`, `skos:related`. |
| `wiki:Source` | `Source` | `http://pod.vardeman.me:3000/vault/wiki/sources/` | `wiki:SourceShape` (source.shacl.ttl) | Citation records. `dct:identifier` required (DOI/arXiv/citekey). `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`. |
| `wiki:Person` | `Person` | `http://pod.vardeman.me:3000/vault/wiki/people/` | `wiki:PersonShape` (person.shacl.ttl) | Authors, collaborators, researchers. FOAF-based. `foaf:nick` for citekey/display aliases. |
| `wiki:Procedure` | `Procedure` | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `wiki:ProcedureShape` (procedure.shacl.ttl) | Agent instructions, workflows, skills. `sh:agentInstruction` on `.meta` carries the procedure body. |
| `wiki:WorkingNote` | `WorkingNote` | `http://pod.vardeman.me:3000/vault/wiki/working/` | `wiki:WorkingShape` (working.shacl.ttl) | Transient notes/drafts/observations (D73). Permissive. Promote via `mem:Crystallize`. |
| `wiki:Hub` (derived) | `Hub` | n/a (materialized by hub-view CONSTRUCT) | n/a | `wiki:Resource` becomes `wiki:Hub` when ≥3 distinct resources point at it via `skos:broader`. |

### B. Phase 2 PARA-era typing (declared by Type Index — drifted)

| Class | Container |
|---|---|
| `skos:Concept` | `http://pod.vardeman.me:3000/vault/resources/concepts/` |
| `vault:TheoryNote` | `http://pod.vardeman.me:3000/vault/resources/theories/` |
| `vault:LiteratureNote` | `http://pod.vardeman.me:3000/vault/resources/literature/` |
| `vault:MethodNote` | `http://pod.vardeman.me:3000/vault/resources/methods/` |
| `vault:Project` | `http://pod.vardeman.me:3000/vault/projects/` |

Per skill guidance, **prefer the `rdfs:seeAlso` containers + container `.meta` (system A) as authoritative**; treat the Type Index as out-of-date.

## 3. Vocabularies the Pod declares

From `void:vocabulary` in `/vault/.well-known/solid`:

- `http://www.w3.org/2004/02/skos/core#` (SKOS)
- `http://purl.org/dc/terms/` (Dublin Core Terms)
- `http://www.w3.org/ns/prov#` (PROV-O)
- `https://pod.vardeman.me/vault/ontology#` (vault-local ontology — HTTPS, not dereferenceable from the HTTP pod)
- `urn:example:wiki#` (wiki-memory L3 placeholder namespace — D79 hybrid stance, non-dereferenceable URN)
- `http://purl.org/spar/cito/` (CiTO citation typing)

Implicit via JSON-LD context (`/vault/meta/context.jsonld`), additionally:

- `http://xmlns.com/foaf/0.1/` (FOAF, used by `wiki:PersonShape`)
- `http://www.w3.org/ns/ldp#` (LDP)
- `http://www.w3.org/ns/shacl#` (SHACL)

Implicit via container Link headers / Memento advertisement:

- `http://www.w3.org/ns/pim/space#` (Storage, Workspace)
- `http://www.w3.org/ns/solid/terms#` (storageDescription, updatesViaStreamingHttp2023)

## 4. Substrate affordances

From `/vault/meta/affordances/`:

| Affordance | Type | Behavior |
|---|---|---|
| **Markdown projection listener** (`markdown-projection.ttl`) | `wiki:WriteAffordance` | Substrate write-time hook. On body+frontmatter writes, projects to `.meta` the predicates listed in `wiki:governs`: `rdf:type`, `dct:title/identifier/created/modified/references/subject/contributor/creator`, `skos:broader/related`, `cito:extends/agreesWith/disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`. Projects from frontmatter keys: `type`, `created`, `modified`, `maturity`, `aliases`, `identifier`, `citekey`. Class-hint table = JSON-LD context. **Agents must NOT PATCH governed predicates on `.meta` directly** — edit body/frontmatter instead. Non-governed predicates remain agent-extensible (D81 Model A). |
| **Memento time-travel** (`memento.ttl`) | `wiki:VersionAffordance` | RFC 7089 conformant (Pattern 1.1: OriginalResource doubles as TimeGate). Append `?ext=timemap` for a resource's TimeMap; append `?version=<14-digit-datetime>` for a Memento. Confirmed by `Link rel="timemap"` / `rel="timegate"` and `Vary: accept-datetime` advertised on the pod root. |
| **Hub-view** (`hub-view.ttl`) | `wiki:DerivedClassAffordance` | Derives `wiki:Hub` for any `wiki:Resource` with ≥3 inbound `skos:broader` edges. Inline CONSTRUCT query run against `/sparql`. Threshold pinned at 3 (`wiki:threshold 3`). |
| **Breadcrumb-view** (`breadcrumb-view.ttl`) | `wiki:DerivedNavigationAffordance` | Walks `skos:broader+` from a starting resource to the root. Inline SELECT against `/sparql`; substitute `<START>` with the starting resource URI before invoking. |

Additional implicit affordances (from headers, not catalog):

- Solid Notifications StreamingHTTPChannel2023: `http://pod.vardeman.me:3000/.notifications/StreamingHTTPChannel2023/...` advertised via `Link rel="updatesViaStreamingHttp2023"`.
- LDP browse: `void:feature <https://w3id.org/cogitarelink/fabric#LDPBrowse>` declared in storage description.

## 5. Inconsistencies, 404s, surprises

1. **Empty shape catalog (documented gap).** `/vault/meta/shapes/` resolves with descriptive `dc:title`/`dc:description` but contains zero `ldp:contains` entries. The shape files referenced by every wiki container `.meta` (e.g. `meta/shapes/page.shacl.ttl`, `source.shacl.ttl`) all 404. SHACL validation is therefore not actually enforceable from declared shapes; the per-container `sh:agentInstruction` prose is the only operational guidance. Matches the skill's documented "shape catalog empty" gap and RQ-Listener-1 territory.

2. **Type Index drift (documented gap).** `/vault/settings/publicTypeIndex` still describes the Phase 2 PARA-era class-to-container mapping (`skos:Concept`/`vault:TheoryNote`/`vault:LiteratureNote`/... → `/vault/resources/*`). It does not register any `wiki:*` class nor any `/vault/wiki/*` container. The standard Solid agent-discovery path (WebID → typeIndex) would route the agent to a parallel, stale view of the Pod. Authoritative L3 routing must come from the storage description's `rdfs:seeAlso` + container `.meta`, not Type Index.

3. **Two parallel container hierarchies coexist.** Both `/vault/wiki/{pages,sources,people,procedures,working}/` (L3, declared in storage description) AND `/vault/resources/{concepts,theories,literature,methods}/` + `/vault/projects/` (Type Index, Phase 2) resolve 200. No declared migration relationship between the two systems.

4. **`urn:example:wiki#` is a non-dereferenceable URN.** Per D79's hybrid-vocabulary stance, `wiki:*` is a placeholder namespace pending real IRI minting. Agents cannot dereference it for vocabulary discovery; the JSON-LD context document is the substitute prefix registry. The storage description does declare `wiki:contextDocument` for exactly this reason.

5. **`https://pod.vardeman.me/vault/ontology#` is HTTPS but the pod is HTTP.** The `void:vocabulary` declaration uses an HTTPS IRI for `vault:`, but the Pod is served over `http://pod.vardeman.me:3000/`. This IRI is not dereferenceable from the running service. (Vocabulary IRIs do not have to be HTTP-fetchable, but the mismatch is worth flagging.)

6. **No explicit class binding for `/vault/wiki/pages/`.** The JSON-LD context declares short-form `Concept` → `wiki:Concept`, and container `.meta` declares the shape as `wiki:PageShape` with guidance "general wiki content (concepts, MOCs, theory notes, daily notes)". Whether the class for pages is `wiki:Page` or `wiki:Concept` (or both, via inheritance) is not stated in any retrieved document.

7. **Derived-view affordances target `/sparql` outside `/vault/`.** Both `hub-view` and `breadcrumb-view` declare `wiki:invokedAt </sparql>` (root-relative). This resolves to `http://pod.vardeman.me:3000/sparql`, suggesting the Comunica sidecar mount point. Agents need to know this is outside the Pod namespace; the descriptor doesn't say so explicitly.

8. **Surprise (positive):** The Memento advertisement is clean and per-RFC. `Vary: accept-datetime` is set, `Link rel="timemap"` and `rel="timegate"` both present, even on a HEAD against the root. This matches Rung 1.1's documented D67 implementation.

9. **Surprise (positive):** Solid Notifications StreamingHTTPChannel2023 endpoint is advertised in the root Link headers without needing a separate discovery step.
