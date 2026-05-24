# Proposal 02 — Bring 8 addressbook affordance descriptors under the PROF contract (8 WARN)

**Resources (DO NOT MODIFY directly):**
- `…/meta/affordances/contact-find-by-name.ttl`
- `…/meta/affordances/contact-find-by-orcid.ttl`
- `…/meta/affordances/contact-find-by-email.ttl`
- `…/meta/affordances/contact-find-by-affiliation.ttl`
- `…/meta/affordances/contact-find-by-group.ttl`
- `…/meta/affordances/org-find-by-name.ttl`
- `…/meta/affordances/org-find-by-ror.ttl`
- `…/meta/affordances/bridge-card-to-wiki.ttl`

**Source files (where the fix belongs):** `overlays/addressbook/affordances/*.ttl`
**Finding:** `descriptor:untyped` — each is typed `wiki:Affordance` only, so it escapes the
`AffordanceDescriptorShape` contract (no `prof:hasRole` / `rdfs:label` / `dct:conformsTo` /
`wiki:installedBy` / typed prose enforced).

> SAFETY: proposal only. Apply at the overlay source + re-deploy via `make reset` or the
> addressbook overlay apply path — do not hand-PATCH the live descriptors.

## Root cause
The addressbook overlay (D87, shipped 2026-05-17) predates the D104 affordance-descriptor
contract (2026-05-23). The wiki-memory affordances were retro-fitted with
`prof:ResourceDescriptor` + role + label + conformsTo + installedBy; the 8 addressbook
ones were not. Catalog membership (`ldp:contains`) is ground truth — they ARE descriptors —
so they should conform. The audit walker enforces the type at membership level precisely so
under-described entries cannot slip through.

## Design decision: which `wiki:*Affordance` subtype?
These are **SPARQL SELECT lookups**, not HTTP query-string-dispatched search handlers.
- They carry `wiki:selectQuery`, invoked via `solid-pod invoke` / Comunica with
  `--default-graph-uri` sources.
- They have NO `?ext=` dispatch endpoint and NO server-side handler.

Therefore they must **NOT** be typed `wiki:SearchAffordance` — that subtype's
`SearchAffordanceShape` requires `wiki:dispatchPattern` (`^\?ext=…$`) + `wiki:targetContainer`
+ a ≥100-char `sh:agentInstruction`, none of which fit a client-side SELECT. (Only
`wiki-search-grep.ttl`, which has a real `?ext=search-grep` handler, is a `SearchAffordance`.)

They satisfy the **base** `AffordanceDescriptorShape` (targets `prof:ResourceDescriptor`)
with the existing `sh:agentInstruction` prose. I propose typing them
`wiki:QueryAffordance` (a new narrow subtype) + `prof:ResourceDescriptor`, with a matching
new role `wikirole:query-affordance`. See **Proposal 04** for the vocab additions; if you
prefer to avoid new vocab, type them with the generic parent `wiki:Affordance` +
`prof:ResourceDescriptor` and role `wikirole:affordance` — the base shape passes either way.

## Proposed amendment (per descriptor)
Add to each — using `contact-find-by-name.ttl` as the worked example; the other seven are
identical except `prof:hasRole`/`rdfs:label`/query body stay as-is:

```turtle
@prefix wiki:     <https://pod.vardeman.me/vault/ontology/wiki#> .
@prefix sh:       <http://www.w3.org/ns/shacl#> .
@prefix prof:     <http://www.w3.org/ns/dx/prof/> .
@prefix dct:      <http://purl.org/dc/terms/> .
@prefix rdfs:     <http://www.w3.org/2000/01/rdf-schema#> .
@prefix wikirole: <https://pod.vardeman.me/vault/ontology/wikirole#> .

</vault/meta/affordances/contact-find-by-name.ttl>
    a wiki:Affordance ,
       wiki:QueryAffordance ,          # new subtype — Proposal 04 (or drop this line)
       prof:ResourceDescriptor ;       # ← brings it under the contract
    prof:hasRole wikirole:query-affordance ;   # new role — Proposal 04
                                               # (or wikirole:affordance to avoid new vocab)
    rdfs:label "Find contact by full name" ;
    dct:conformsTo <http://www.w3.org/TR/dx-prof/> ;
    wiki:installedBy <https://pod.vardeman.me/vault/ontology/overlay#addressbook> ;
    sh:agentInstruction """ … (unchanged existing prose) … """ ;
    wiki:selectQuery """ … (unchanged) … """ .
```

### Per-descriptor `rdfs:label` suggestions
| File | `rdfs:label` |
|---|---|
| contact-find-by-name.ttl | "Find contact by full name" |
| contact-find-by-orcid.ttl | "Find contact by ORCID" |
| contact-find-by-email.ttl | "Find contact by email" |
| contact-find-by-affiliation.ttl | "Find contact by affiliation" |
| contact-find-by-group.ttl | "Find contact by group" |
| org-find-by-name.ttl | "Find organization by name" |
| org-find-by-ror.ttl | "Find organization by ROR" |
| bridge-card-to-wiki.ttl | "Bridge contact card to wiki page" |

### Constants verified against the live Pod / repo
- `wiki:installedBy` → `…/ontology/overlay#addressbook` (matches
  `overlays/addressbook/manifest.ttl` subject; the other affordances use
  `overlay#wiki-memory`). NB: neither overlay IRI currently dereferences — see Proposal 05.
- `dct:conformsTo <http://www.w3.org/TR/dx-prof/>` — same value the wiki-memory affordances use.
- All 8 already carry `sh:agentInstruction`, so the `sh:or` prose requirement is satisfied
  with no new prose needed.

## How to apply
1. Edit the 8 files under `overlays/addressbook/affordances/`.
2. If adopting `wiki:QueryAffordance` / `wikirole:query-affordance`, apply **Proposal 04** first.
3. `make reset` (or addressbook overlay re-apply) to redeploy.
4. Re-run `make audit` — the 8 `descriptor:untyped` WARNs clear, and no `SearchAffordanceShape`
   ERRORs appear (because we did NOT type them `wiki:SearchAffordance`).

## Cross-batch consistency check (per agentic-development.md)
Verify after applying: each amended descriptor's `prof:hasRole` value exists in the wikirole
scheme (`wikirole:query-affordance` requires Proposal 04; `wikirole:affordance` already
exists). A descriptor pointing at an undefined role would pass SHACL (`nodeKind sh:IRI`
only) but be a latent dangling reference — exactly the `wikirole:search-affordance` bug in
Proposal 03.
