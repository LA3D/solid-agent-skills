# Pod Discovery Report — http://pod.vardeman.me:3000/vault/

## 1. Discovery path

| # | Method | URL | Accept | Status | What I learned |
|---|---|---|---|---|---|
| 1 | HEAD | `/vault/` | (none) | 200 | Found `solid:storageDescription` Link → `.well-known/solid`. Also saw `timemap`/`timegate` Links (Memento advertised), `describedby` → `.meta`, and `Vary: accept-datetime`. |
| 2 | GET | `/vault/.well-known/solid` | text/turtle | 200 | Storage description: 6 vocabularies declared via `void:vocabulary`, 4 catalog pointers (`wiki:contextDocument`, `wiki:shapeCatalog`, `wiki:affordanceCatalog`, `wiki:typeIndex`), 5 `rdfs:seeAlso` containers under `/wiki/`, conforms to `fabric:CoreProfile`, `fabric:SolidPodProfile`, `wiki:L3Profile`. |
| 3 | GET | `/vault/meta/context.jsonld` | (default) | 200 | Prefix→IRI registry + short-form aliases (`extends → cito:extends`, etc.). Confirms hybrid vocab stance. |
| 4 | GET | `/vault/meta/affordances/` | text/turtle | 200 | LDP container listing 4 affordance descriptors. |
| 5-8 | GET | `/vault/meta/affordances/{markdown-projection,breadcrumb-view,memento,hub-view}.ttl` | (default) | 200 | One write affordance (Model A predicate governance), two derived view affordances over `/sparql`, one version affordance (RFC 7089). |
| 9-13 | GET | `/vault/wiki/{pages,sources,people,procedures,working}/` | text/turtle | 200 | Each container's `.meta` carries `sh:agentInstruction` + `wiki:shape` pointer + LDP type triples. These five are the live resource-type homes. |
| 14 | GET | `/vault/settings/publicTypeIndex` | text/turtle | 200 | Phase-2 entries (concepts, theories, literature, methods, projects) — stale per Rung 1.4 known drift. |
| 15 | GET | `/vault/meta/shapes/` | text/turtle | 200 | Container exists with descriptive title but is empty (no `ldp:contains`, no shape files). |

## 2. Resource types and their containers

The five live wiki-memory L3 classes (D76/D77), discovered via the storage description's `rdfs:seeAlso` and confirmed by each container's `.meta`:

| Resource type (class IRI) | Container URL | Shape (declared but empty file) | Notes |
|---|---|---|---|
| `wiki:Page` (`urn:example:wiki#Page`) | `http://pod.vardeman.me:3000/vault/wiki/pages/` | `<meta/shapes/page.shacl.ttl>` (404) | Permissive — general wiki content (concepts, MOCs, theory notes, daily notes). Use `dct:title`, `skos:broader`, `skos:related`. |
| `wiki:Source` (`urn:example:wiki#Source`) | `http://pod.vardeman.me:3000/vault/wiki/sources/` | `<meta/shapes/source.shacl.ttl>` (404) | Citation records. `dct:identifier` required. Use `cito:extends`, `cito:agreesWith`, `cito:disagreesWith`. |
| `wiki:Person` (`urn:example:wiki#Person`) | `http://pod.vardeman.me:3000/vault/wiki/people/` | `<meta/shapes/person.shacl.ttl>` (404) | FOAF-based. `foaf:nick` for citekey/alias linking. |
| `wiki:Procedure` (`urn:example:wiki#Procedure`) | `http://pod.vardeman.me:3000/vault/wiki/procedures/` | `<meta/shapes/procedure.shacl.ttl>` (404) | Procedural memory. Body in `sh:agentInstruction` on `.meta`. |
| `wiki:WorkingNote` (`urn:example:wiki#WorkingNote`) | `http://pod.vardeman.me:3000/vault/wiki/working/` | `<meta/shapes/working.shacl.ttl>` (404) | Permissive working memory (D73). Promotable via `mem:Crystallize`. |

Two derived (computed, not stored) classes advertised by the affordance catalog:
- `wiki:Hub` — projected by the hub-view CONSTRUCT (threshold ≥3 `skos:broader` incoming edges).
- `wiki:Resource` — superclass implied by `wiki:targetClass` in breadcrumb-view + hub-view affordances.

**Stale Type Index registrations** (Phase 2 PARA legacy, NOT live wiki-memory containers):
- `skos:Concept` → `/vault/resources/concepts/`
- `vault:TheoryNote` → `/vault/resources/theories/`
- `vault:LiteratureNote` → `/vault/resources/literature/`
- `vault:MethodNote` → `/vault/resources/methods/`
- `vault:Project` → `/vault/projects/`

Per the skill, agents should rely on `rdfs:seeAlso` + container `.meta`, not the Type Index, until D78-driven update lands.

## 3. Vocabularies declared

Declared via `void:vocabulary` on the storage description (D49 — every vocabulary used must be declared and dereferenceable):

| Prefix | IRI | Role |
|---|---|---|
| `skos` | `http://www.w3.org/2004/02/skos/core#` | Conceptual hierarchy (`skos:broader`, `skos:related`) |
| `dct` | `http://purl.org/dc/terms/` | Bibliographic metadata, identifiers, dates |
| `prov` | `http://www.w3.org/ns/prov#` | Provenance (`prov:wasGeneratedBy`) |
| `vault-ontology` | `https://pod.vardeman.me/vault/ontology#` | Legacy Phase-2 vault types (TheoryNote etc., referenced from Type Index only) |
| `wiki` | `urn:example:wiki#` | Pod-local L3 classes/predicates (`wiki:Page`, `wiki:maturity`, `wiki:Hub`, governance predicates) — D79 placeholder namespace |
| `cito` | `http://purl.org/spar/cito/` | Typed citations (`cito:extends`, `cito:agreesWith`, `cito:disagreesWith`) |

Also seen in use (declared via the JSON-LD context but not under `void:vocabulary`): `foaf:` (`http://xmlns.com/foaf/0.1/`), `ldp:` (`http://www.w3.org/ns/ldp#`), `sh:` (`http://www.w3.org/ns/shacl#`), `pim:` (`http://www.w3.org/ns/pim/space#`).

Conforms-to claims: `fabric:CoreProfile`, `fabric:SolidPodProfile` (both `https://w3id.org/cogitarelink/fabric#`), and `wiki:L3Profile`.

## 4. Substrate affordances advertised

Four descriptors under `/vault/meta/affordances/`:

### Write-time behavior — `markdown-projection.ttl` (`wiki:WriteAffordance`)
- **What**: The `MarkdownProjectionListener` projects body+frontmatter into `.meta` on resource write (D58/D71/D81).
- **Governed predicates** (D81 Model A — substrate owns these on the resource subject; agent owns everything else):
  `rdf:type, dct:title, dct:identifier, dct:created, dct:modified, dct:references, dct:subject, dct:contributor, dct:creator, skos:broader, skos:related, cito:extends, cito:agreesWith, cito:disagreesWith, wiki:maturity, prov:wasGeneratedBy`
- **Frontmatter keys projected**: `type, created, modified, maturity, aliases, identifier, citekey`.
- **Class-hint table**: points at `meta/context.jsonld`.
- **Agent instruction**: edit body+frontmatter for governed predicates; do not PATCH `.meta` directly. Non-governed predicates remain agent-extensible.

### Time-travel — `memento.ttl` (`wiki:VersionAffordance`)
- Conforms to RFC 7089.
- **TimeMap**: append `?ext=timemap` to any resource URL.
- **Memento**: append `?version=<14-digit-datetime>` (e.g. `?version=20260515171025`).
- Pattern 1.1 — OriginalResource doubles as TimeGate. Advertised on every resource via `Link: rel="timemap"` / `rel="timegate"` + `Vary: accept-datetime` (D67).

### Query views — two derived affordances invoked at `/sparql`
- **`hub-view.ttl`** (`wiki:DerivedClassAffordance`): CONSTRUCT promotes any `wiki:Resource` with ≥3 incoming `skos:broader` edges to `wiki:Hub`. Threshold `wiki:threshold 3`. Run on demand against `/sparql` (D80: no materialization, no push for v1).
- **`breadcrumb-view.ttl`** (`wiki:DerivedNavigationAffordance`): SELECT walks `skos:broader+` from a `<START>` URI to the root.

## 5. Inconsistencies, 404s, surprises

1. **Shape catalog declared but empty.** `/vault/meta/shapes/` is a valid LDP BasicContainer (200 OK, descriptive `dc:title`/`dc:description` naming all 5 shapes), but has no `ldp:contains` triples. Each container's `.meta` cites `<../../meta/shapes/{page,source,person,procedure,working}.shacl.ttl>` via `wiki:shape` — fetching any of those would 404. Documented as a known Rung 1.4 gap; class-level `sh:agentInstruction` on container `.meta` carries the guidance until the shape files ship.

2. **Type Index is stale.** Lists Phase-2 PARA classes (`skos:Concept` → `/resources/concepts/`, `vault:TheoryNote`, `vault:LiteratureNote`, `vault:MethodNote`, `vault:Project`) — none of those containers are reachable from the storage description's `rdfs:seeAlso` set. None of the 5 wiki classes are registered. A naive agent that prefers Type Index would miss the live containers entirely. The skill correctly directs agents to `rdfs:seeAlso` + container `.meta`.

3. **`void:vocabulary` split across two triples** on the storage description (standard W3C vocabs on one line; `wiki:` + `cito:` on a second). RDF-semantically additive — six IRIs total — but visually surprising on first read. Possible serialization quirk.

4. **`wiki:` namespace is `urn:example:wiki#`** — a placeholder per D79. Not dereferenceable to a real ontology document; agents must rely on the JSON-LD context for term semantics. Real namespace minting deferred.

5. **No 404s encountered** during discovery — every URL named in a Link header, `rdfs:seeAlso`, or affordance descriptor that I actually fetched returned 200. Predicted 404s on the shape catalog filenames are inferred from the empty container, not verified by request (would consume budget for a known-gap confirmation).

6. **Memento on the root container**: the root LDP container itself advertises a TimeMap. Containers being versioned (not just leaf resources) is worth noting for time-travel queries that target structure changes.

7. **Notifications channel advertised** in the root Link headers: `<http://pod.vardeman.me:3000/.notifications/StreamingHTTPChannel2023/...>; rel="...updatesViaStreamingHttp2023"` — Solid Notifications Protocol is wired up (D56 substrate hook), though no `mem:*` trigger vocabulary surfaced in this discovery pass (D74 not yet implemented).
