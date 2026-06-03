---
name: pod-discover
description: Cold-start discovery workflow for a wiki-memory Solid Pod (a SKOS-backed agentic memory pod) — follow the storage-description Link header from any URL to reach the JSON-LD context, affordance catalog, SHACL shape catalog, Type Index, and typed wiki containers. Use this skill whenever you arrive on a Solid Pod and need to learn what kinds of resources it holds, what vocabularies it uses, what affordances the substrate offers, and where to read or write content. Triggers on any task involving Solid Pod navigation, discovering resource types, learning a Pod's capabilities, or first contact with an unknown Pod.
---

# Pod Discovery — Cold-Start Arrival

A wiki-memory Solid Pod describes itself through standard HTTP affordances. You do not need prior
knowledge of its schema — every step is a `GET` against a URL discoverable from the previous step.
This skill walks the discovery chain from any URL to the typed containers, the substrate affordances,
and the Pod's own authoring guide.

The Pod is an **agentic memory pod**: a SKOS concept backbone where concepts are the navigational
spine and notes/pages attach to them via typed edges. Treat the URL path segments (`wiki`, `vault`)
as **opaque** — meaning is defined by the RDF in each resource's `.meta`, not by the words in the path.

## Quick reference

**Entry point**: Any resource's `Link` header carries `rel="http://www.w3.org/ns/solid/terms#storageDescription"`
(the spec-mandated slot, per D44). Follow it.

**Prefixes used below** (canonical IRIs confirmed from the live context document):
```
sub:      https://pod.vardeman.me/vault/ontology/substrate#   # substrate vocab: catalogs, routing, affordances, governance
wiki:     https://pod.vardeman.me/vault/ontology/wiki#         # L3 content classes that lack a standard term (Source, WorkingNote)
wikirole: https://pod.vardeman.me/vault/ontology/wikirole#     # PROF roles
cap:      https://pod.vardeman.me/vault/ontology/capability#   # capability catalog
solid:    http://www.w3.org/ns/solid/terms#
prof:     http://www.w3.org/ns/dx/prof/
skos:/dct:/prov:/cito:/foaf:/schema:                            # standard W3C + community vocabularies
```

**Reachable from the storage description**:
| Pointer predicate | Target | Purpose |
|---|---|---|
| `sub:agentGuide` | `/vault/wiki/concepts/how-wiki-memory-works.md` | **Read this first** — the Pod's own write guide (SKOS model, label frames, 422 contract) |
| `sub:contextDocument` | `/vault/meta/context.jsonld` | Canonical prefix→IRI registry + short-form predicate aliases |
| `sub:affordanceCatalog` | `/vault/meta/affordances/` | Per-behavior substrate descriptors (D52) |
| `sub:shapeCatalog` | `/vault/meta/shapes/` | SHACL shape files (the write contracts) |
| `solid:publicTypeIndex` | `/vault/settings/publicTypeIndex` | Standard Solid class → container routing (works; D8/D107) |
| `rdfs:seeAlso` (×7) | the 7 typed wiki containers | `/vault/wiki/{concepts,people,places,events,organizations,procedures,working}/` |
| `prof:hasResource` (×5) | `/vault/meta/profiles/{page,concept,person,howto,working}` | PROF resource descriptors — per-kind profile hints (D86) |
| `cap:catalog` | `/vault/meta/capabilities/` | Capability catalog (D83) |
| `sub:templateCatalog` | `/vault/meta/templates/` | Authoring templates |
| `sub:extensionGuide` | `/vault/meta/extending-l3.md` | How to extend the substrate at a new container (D100) |
| `sub:contactCatalog` | `/vault/contacts/` | vCard AddressBook substrate (separate from `/wiki/people/`) |
| `sub:profileDocument` | `/vault/wiki/index.md` | The Pod's human-facing landing page |

**Vocabularies declared via `void:vocabulary`**: standard W3C/community (`skos:`, `dct:`, `prov:`,
`cito:`) + pod-local (`wiki:`, `sub:`, `wikirole:`). Aggressive standard reuse is deliberate (D107):
content classes are mostly standard terms, not pod-local.

## Step 1: Find the storage description

Hit any URL on the Pod and read the `solid:storageDescription` Link.

```bash
curl -sSI https://pod.vardeman.me/vault/ | grep -i '^link:'
```

The one that matters:

```
Link: <https://pod.vardeman.me/vault/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"
```

This is the entry point. Other useful Links you'll see in passing:
- `describedby` → this resource's `.meta` sidecar (where its RDF metadata lives)
- `timemap` / `timegate` → RFC 7089 time-travel (D61)
- `type` → LDP/PIM types (`pim:Storage`, `ldp:Container`, …)
- `rel="profile"` → `fabric:CoreProfile`, `fabric:SolidPodProfile` (out-of-band profile hints, RFC 6906)

## Step 2: Read the storage description

```bash
curl -sS -H "Accept: text/turtle" https://pod.vardeman.me/vault/.well-known/solid
```

The served Turtle uses full/relative IRIs; prefixed for readability it declares:

```turtle
<../> a pim:Storage, void:Dataset, dcat:DataService ;
    dct:conformsTo fabric:CoreProfile, fabric:SolidPodProfile ;
    void:vocabulary skos:, dct:, prov:, cito:, wiki:, sub:, wikirole: ;
    sub:agentGuide          </vault/wiki/concepts/how-wiki-memory-works.md> ;   # READ FIRST
    sub:contextDocument     </vault/meta/context.jsonld> ;
    sub:affordanceCatalog   </vault/meta/affordances/> ;
    sub:shapeCatalog        </vault/meta/shapes/> ;
    solid:publicTypeIndex   </vault/settings/publicTypeIndex> ;
    cap:catalog             </vault/meta/capabilities/> ;
    sub:templateCatalog     </vault/meta/templates/> ;
    sub:extensionGuide      </vault/meta/extending-l3.md> ;
    sub:contactCatalog      </vault/contacts/> ;
    sub:profileDocument     </vault/wiki/index.md> ;
    rdfs:seeAlso </vault/wiki/concepts/>, </vault/wiki/people/>, </vault/wiki/places/>,
                 </vault/wiki/events/>, </vault/wiki/organizations/>,
                 </vault/wiki/procedures/>, </vault/wiki/working/> ;
    prof:hasResource </vault/meta/profiles/page>, </vault/meta/profiles/concept>,
                     </vault/meta/profiles/person>, </vault/meta/profiles/howto>,
                     </vault/meta/profiles/working> ;
    sh:agentInstruction "This Pod's memory is a SKOS concept backbone. Every wiki page has TWO RDF
      subjects with three frame roles: the page document <> (dct:title), the entity <#this>
      (schema:name), and -- when the entity is a concept -- the SKOS unit <#this> (skos:prefLabel).
      skos:broader/narrower/related is the navigation axis. Writes are validated by SHACL shapes; a
      422 returns a sh:ValidationReport you correct against. Read sub:agentGuide before writing." .
```

What to extract:
1. The storage-level `sh:agentInstruction` — the substrate's own one-paragraph orientation. Read it.
2. `sub:agentGuide` — fetch `how-wiki-memory-works.md` next; it is the authoritative write guide.
3. `void:vocabulary` — the namespaces in play.
4. `sub:contextDocument` — the prefix/alias registry (Step 3).
5. `sub:affordanceCatalog` — substrate behaviors (Step 4).
6. The 7 `rdfs:seeAlso` containers + the `solid:publicTypeIndex` (Steps 5–6).

## Step 3: Read the JSON-LD context (vocabulary registry)

```bash
curl -sS https://pod.vardeman.me/vault/meta/context.jsonld
```

Returns a JSON-LD `@context`. **Prefix registry:**
```json
"wiki": "https://pod.vardeman.me/vault/ontology/wiki#",
"sub":  "https://pod.vardeman.me/vault/ontology/substrate#",
"cito": "http://purl.org/spar/cito/",
"foaf": "http://xmlns.com/foaf/0.1/",
"schema": "https://schema.org/"
```
**Short-form aliases** (these tell you what the Pod's L3 *means* by each edge):
```json
"title":      "dct:title",
"references": "dct:references",
"source":     "dct:source",
"broader":    "skos:broader",      "related":    "skos:related",
"contributor":"dct:contributor",   "creator":    "dct:creator",
"extends":    "cito:extends",       ← W3C CITO, not a pod-local term
"supports":   "cito:agreesWith",    "criticizes": "cito:disagreesWith",
"about":      "schema:about",       "affiliation":"schema:affiliation",
"identifier": "schema:identifier",  "member":     "schema:member"
```
Hybrid vocabulary stance (D107): standard terms (DCT/SKOS/CITO/FOAF/schema.org) by default; `wiki:`/`sub:`
only for genuine gaps. When you meet a `.meta` triple like `<resource> cito:extends <other>`, this
registry is how you decode it.

## Step 4: List the affordance catalog (substrate behaviors)

```bash
curl -sS -H "Accept: text/turtle" https://pod.vardeman.me/vault/meta/affordances/
```

Returns an `ldp:Container` listing ~20 affordance descriptors, grouped by concern:

| Group | Descriptors | Purpose |
|---|---|---|
| Core projection/derivation | `markdown-projection`, `hub-view`, `breadcrumb-view` | Body→`.meta` projection (D58/D71); derived Hub when ≥3 `skos:broader` children (D80); nav chains |
| Lifecycle | `crystallize`, `supersede`, `demote`, `archive`, `link`, `merge`, `memory-history` | Two-stage commit + memory operations + provenance log |
| Versioning | `memento` | RFC 7089 time-travel via `?ext=timemap` / `?version=<14-digit-datetime>` (D61) |
| Search | `wiki-search-grep` | Recursive literal-substring search over markdown bodies (D87) |
| Contacts/orgs | `contact-find-by-{name,email,orcid,affiliation,group}`, `org-find-by-{name,ror}`, `bridge-card-to-wiki` | vCard AddressBook queries + the contacts↔wiki/people bridge |

Fetch any descriptor for its `sh:agentInstruction`. The key one for writing:

```bash
curl -sS -H "Accept: text/turtle" https://pod.vardeman.me/vault/meta/affordances/markdown-projection.ttl
```

It declares `sub:governs` (predicates the substrate writes for you — `rdf:type`, `dct:title`,
`dct:identifier`, `dct:created/modified`, `dct:references/source/subject/contributor/creator`,
`skos:broader/related`, `cito:extends/agreesWith/disagreesWith`, `wiki:maturity`, `prov:wasGeneratedBy`)
and `sub:projectsFromFrontmatter` (frontmatter keys it reads — `type`, `created`, `modified`,
`maturity`, `aliases`, `identifier`, `citekey`). Its `sh:agentInstruction`:
> "Substrate writes the predicates listed in sub:governs. To express any of those, edit the
> body+frontmatter; do not PATCH .meta directly. Other predicates are agent-extensible."

This is D81 Model A: substrate owns governed predicates; you own everything else.

## Step 5: The seven typed containers

The `rdfs:seeAlso` list gives the seven containers. Class is resolved via the Type Index (Step 6).
Content classes are **standard vocabulary terms** where one exists (D105/D106):

| Container | Class | Use for |
|---|---|---|
| `/vault/wiki/concepts/` | `skos:Concept` **and** `wiki:Source` | Concepts (the SKOS backbone — `skos:prefLabel` required) AND citation records (`wiki:Source`, `dct:identifier` required). Both route here. |
| `/vault/wiki/people/` | `schema:Person` | People — `foaf:name` preferred; `foaf:nick` lists aliases for cross-system linking |
| `/vault/wiki/places/` | `schema:Place` | Places |
| `/vault/wiki/events/` | `schema:Event` | Events |
| `/vault/wiki/organizations/` | `schema:Organization` | Organizations |
| `/vault/wiki/procedures/` | `schema:HowTo` | Procedural memory — body carries the procedure; `schema:step` for structure |
| `/vault/wiki/working/` | `wiki:WorkingNote` (permissive) | Low-ceremony scratchpad; promotes to durable via `crystallize` (D73) |

Some containers carry a class-level `sh:agentInstruction` in their `.meta` (confirmed on `people`,
`procedures`, `working` — fetch the container with `Accept: text/turtle`):

```bash
curl -sS -H "Accept: text/turtle" https://pod.vardeman.me/vault/wiki/people/
# <> dc:title "Wiki People" ;
#    sh:agentInstruction "Person records. FOAF-based. foaf:name preferred over dct:title.
#      foaf:nick lists aliases (citekey patterns, social handles, display names)." ;
#    sub:shape </vault/meta/shapes/person.shacl.ttl> .
```

> **Current gap (verified 2026-06-03):** `concepts`, `places`, `events`, and `organizations`
> containers do **not** yet carry a class-level `sh:agentInstruction` or `sub:shape` pointer — their
> `.meta` holds only the LDP listing. For those, the authoritative write contract is the SHACL shape
> reached via the Type Index (Step 6) + the `sub:agentGuide`. Don't treat a missing container
> instruction as "no rules" — the shape still governs writes.

## Step 6: Type Index — class → container routing

The Type Index works (the old Phase-2 PARA drift is resolved). It is the canonical class→container map
**and** the addressing axis (D105/D106):

```bash
curl -sS -H "Accept: text/turtle" https://pod.vardeman.me/vault/settings/publicTypeIndex
```

| `solid:forClass` | `solid:instanceContainer` |
|---|---|
| `skos:Concept` | `/vault/wiki/concepts/` |
| `wiki:Source` | `/vault/wiki/concepts/` |
| `schema:Person` | `/vault/wiki/people/` |
| `schema:Place` | `/vault/wiki/places/` |
| `schema:Event` | `/vault/wiki/events/` |
| `schema:Organization` | `/vault/wiki/organizations/` |
| `schema:HowTo` | `/vault/wiki/procedures/` |
| `wiki:WorkingNote` | `/vault/wiki/working/` |
| `vcard:AddressBook` | `/vault/contacts/index.ttl#this` (registered as `solid:instance`) |

To write a resource of a given class, resolve its container here, then satisfy that container's shape.

## Step 7: Decision tree — what to do next

```
Want to understand the write model before writing?
  → GET sub:agentGuide (/vault/wiki/concepts/how-wiki-memory-works.md) — the SKOS model + label frames + 422 contract

Want to read a specific resource?
  → GET <resource-url>; follow its describedby Link → <resource-url>.meta for the RDF (the graph view)

Want to query across a container (the graph view)?
  → The Pod hosts NO SPARQL endpoint — querying is client-side via Comunica with explicit/.meta sources
    (the solid-pod sparql CLI auto-discovers a container's .meta). See the pod-query skill.

Want to write a new resource?
  → Resolve the container via the Type Index (Step 6) → satisfy its SHACL shape.
    A violation returns HTTP 422 + a sh:ValidationReport; read sh:resultPath / sh:resultMessage and fix.
    Low-ceremony alternative: POST to /vault/wiki/working/ (permissive), then crystallize.

Want to time-travel?
  → Append ?ext=timemap or ?version=<14-digit-datetime> to any resource URL (memento.ttl)

Want to know which predicates the substrate owns vs you own?
  → GET /vault/meta/affordances/markdown-projection.ttl → sub:governs list
```

## Key principle

**The Pod describes itself. Follow the affordances.** Every URL you fetch is reachable from a previous
one via a Link header, `rdfs:seeAlso`, or a typed pointer (`sub:contextDocument`, `sub:affordanceCatalog`,
`solid:publicTypeIndex`, …). If you find yourself guessing a path (`/api/…`, `/admin/…`, `/data/…`),
stop — re-read the storage description for the right pointer. And remember the path segments are
opaque: read the `.meta`, not the words in the URL.

The discovery chain is short:
1. `GET <any-url>` → `solid:storageDescription` Link
2. `GET storage-description` → `sub:agentGuide` + catalog pointers + Type Index + container links
3. `GET <agentGuide / catalog / container / shape>` → the actual model and capabilities

## Output reporting

When asked to report what you discovered, include:
- **Discovery path**: every URL you fetched, in order, with what you learned from each
- **Resource types**: the classes from the Type Index (the 8 wiki classes across 7 containers)
- **Vocabularies**: the `void:vocabulary` list + how the JSON-LD context maps the short-form aliases
- **Affordances**: the affordance-catalog groups, with one-line summaries from `sh:agentInstruction`
- **Write model**: the SKOS-backbone summary from `sub:agentGuide` + the 422 correction contract
- **Anything broken**: 404s, stale data, missing container instructions, contradictions you noticed
