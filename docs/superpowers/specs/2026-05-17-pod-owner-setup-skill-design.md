# Pod-Owner Setup Skill — Design Spec

**Status:** Design (brainstormed, awaiting user review). Not yet a writing-plans plan.

**Date:** 2026-05-17

**Repos touched:** `solid-agent-skills` (three new skills) + `cogitarelink-solid`
(one new substrate overlay + one tmpl: vocab extension).

**Related plans (MEMORY.md):** items #1 (`solid-pod setup-owner` CLI — superseded
by skill-only approach) and #2 (`solid-addressbook` + `solid-wiki-memory-l3`
skill refinement), now picked up together in this sprint.

**Anchor:** docs `2026-05-16-identity-and-provenance-design.md` (positions
A/B/C, role-overlay model, agent identity threads) and
`2026-05-16-agentic-addressbook-design.md` (AddressBook substrate, shipped
2026-05-17). This sprint takes the third leg of the same identity-stack
turn-on by adding owner-identity as a substrate-level concern above
AddressBook.

---

## Goals

1. **Add a Pod-owner identity overlay** to the substrate (cogitarelink-solid)
   that declares, validates, and templates the enrichment of the Pod-owner
   WebID profile at `/vault/profile/card#me` — making the contract explicit
   and SHACL-validated, with forward extension points for Verifiable
   Credentials, DIDs, and ACL ownership wiring.

2. **Ship three agent-facing skills** in solid-agent-skills that orchestrate
   the existing `solid-pod` CLI primitives without adding new CLI commands:

   - `solid-owner-identity` — Pod-owner identity ops + setup-owner orchestration
   - `solid-addressbook` — AddressBook CRUD against the existing overlay
   - `solid-wiki-memory-l3` — wiki-memory L3 ops (minimal this sprint;
     two-stage commit + working-memory deferred)

3. **Encode the agent↔human elicitation pattern** by treating the Solid-spec-
   required `pim:preferencesFile` (`/vault/settings/prefs.ttl`) as the scratchpad
   where setup-owner walks the human through fact collection — one question at a
   time, SHACL-validated, persisted on each answer.

4. **Make the L1→L2→L3 identity bridge agent-discoverable in a single
   dereference** ("follow-the-nose"): the WebID response asserts both
   `foaf:isPrimaryTopicOf <wiki-page>` AND inlines `<wiki-page> a wiki:Person`
   so an LLM reading the WebID has enough to recognize the L3 agentic-memory
   record without a second round-trip.

## Non-goals

- **No new CLI commands.** The setup-owner CLI command in MEMORY.md plan #1
  is superseded by a skill that orchestrates `solid-pod info / read / sparql /
  invoke / create / patch` and the existing AddressBook templates.
- **No authentication wiring.** Pre-ACL setup-owner runs unauthenticated.
  Phase 6 (WAC/ACP turn-on) requires Solid-OIDC + DPoP; documented as a known
  gap in the skill, out of scope for this sprint.
- **No VC issuance, no DID-WebID bridge.** Both are forward extension points
  in the shape (`cred:credentialSubject`, `alsoKnownAs <did:...>`); not
  implemented in v1.
- **No full wiki-memory L3 coverage.** This sprint ships the minimal subset
  needed by setup-owner: discovery, page-create (wiki:Person), bridge
  procedure. Two-stage commit (D73), working-memory permissive shape, and
  the remaining 5 shape classes (Source / Procedure / Page / etc.) are
  deferred to a follow-on "Memory Structuring Sprint."
- **No interactive CLI shell.** The agent↔human conversation is the
  Claude Code conversation surface; the skill instructs the agent on
  what to ask and when to persist.

---

## Architecture

### Three-skill split mirrors three substrate concerns

| Substrate concern | Overlay (cogitarelink-solid) | Agent skill (solid-agent-skills) |
|---|---|---|
| Pod-owner identity | `overlays/owner-identity/` *(NEW)* | `solid-owner-identity` *(NEW)* |
| Contact directory | `overlays/addressbook/` *(existing)* | `solid-addressbook` *(NEW)* |
| Knowledge layer | `overlays/wiki-memory/` *(existing)* | `solid-wiki-memory-l3` *(NEW)* |

### Capability dependency chain (D87 capabilities-only deps)

```
cap:PodOwnerIdentity              (provided by owner-identity overlay)
  ├── requires cap:tmpl-vocabulary v≥1.1     (provided by addressbook)
  ├── requires cap:vcard-individual-substrate (provided by addressbook)
  └── requires cap:foaf-primarytopic-bridge   (provided by wiki-memory)
```

The owner-identity overlay sits *atop* both AddressBook and wiki-memory —
the WebID enrichment references AddressBook contact-card IRIs and wiki page
IRIs. AddressBook itself depends on wiki-memory for the
`foaf-primarytopic-bridge` capability (existing dependency).

### Three-layer Pod-owner identity model

| Layer | Artifact | Role | URL |
|---|---|---|---|
| **L1 — Pod substrate** | WebID profile | Canonical identity, auth-required triples, spec-conformant | `/vault/profile/card#me` |
| **L2 — Operational identity** | AddressBook contact card | vcard predicates, time-scoped affiliations, app-compat (SolidOS contacts-pane) | `/vault/contacts/Person/<uuid>/index.ttl#this` |
| **L3 — Agentic memory** | Wiki person page | Deep semantic context for LLMs — markdown body + concept edges + sources + narrative | `/vault/wiki/people/<slug>/index.md` |

All three IRIs denote the same agent. Bridge predicates:

| From → To | Predicate | Spec basis |
|---|---|---|
| WebID → ORCID | `owl:sameAs <https://orcid.org/...>` | Solid WebID Profile §3.3 "encouraged for two WebIDs that denote the same entity" |
| WebID → contact card | `owl:sameAs </vault/contacts/Person/<uuid>/index.ttl#this>` | same §3.3, generalized to IRIs |
| WebID → wiki page | `foaf:isPrimaryTopicOf </vault/wiki/people/<slug>/index.md>` | Solid WebID Profile §3.1 "extended profile documents" |
| Wiki page → WebID | `foaf:primaryTopic </vault/profile/card#me>` (in `.meta`) | FOAF; project convention (D75) |
| Contact card → WebID | `vcard:url [ a vcard:WebId ; vcard:value </vault/profile/card#me> ]` | SolidOS contacts-pane convention |

### Follow-the-nose discovery (A + C combined)

Single dereference of the WebID must yield enough context for an LLM to
recognize the L3 agentic-memory record without further round-trips. The
WebID response is enriched with two design hooks:

1. **Inline type assertion of linked resources.** Beyond the
   `foaf:isPrimaryTopicOf <wiki-page>` triple, the WebID response also
   contains `<wiki-page> a wiki:Person` — so one dereference gives the LLM
   "this WebID has an extended profile" AND "that extended profile is
   typed as a wiki:Person (an L3 agentic-memory record)" simultaneously.

2. **Shape `sh:agentInstruction`** documents the three-layer model and the
   L1→L3 bridge explicitly. Reachable via `dct:conformsTo
   <PodOwnerWebIDShape>` in `/vault/profile/card.meta`. Deeper-context for
   agents that fetch the shape.

---

## Substrate work (cogitarelink-solid)

### 1. tmpl: vocabulary extension (one predicate)

The existing `tmpl:` vocab supports PUT/POST templates targeting a container.
Add support for PATCH templates targeting an existing resource:

```turtle
# Added to overlays/addressbook/vocabulary/template.ttl:

tmpl:targetResource
    a rdf:Property ;
    rdfs:label "target resource" ;
    rdfs:comment "The specific resource (not container) a filled template is
      applied to. Used for PATCH templates that operate on an existing
      resource rather than creating a new one under a container. Exactly one
      of tmpl:targetContainer or tmpl:targetResource must be present on a
      Template; never both." ;
    rdfs:domain tmpl:Template ;
    rdfs:range  rdfs:Resource .
```

Bump `overlays/addressbook/capabilities/tmpl-vocabulary.ttl` to v1.1.

`tmpl:operation` already documents "PUT, PATCH, POST" as valid values
(verified — vocab comment names all three), so no extension to the operation
enum is needed.

### 2. New overlay: `overlays/owner-identity/`

Directory layout mirrors `overlays/addressbook/`:

```
overlays/owner-identity/
  manifest.ttl
  shapes/
    webid-profile.shacl.ttl              # PodOwnerWebIDShape
    pod-owner-preferences.shacl.ttl      # PodOwnerPreferencesShape
  templates/
    webid-enrich.ttl                     # PATCH /vault/profile/card
    prefs-init.ttl                       # PUT /vault/settings/prefs.ttl skeleton
  capabilities/
    pod-owner-identity.ttl
    webid-profile-shape.ttl
    pod-owner-preferences-shape.ttl
    webid-enrich-template.ttl
    prefs-init-template.ttl
  vocabulary/
    owner-prefs.ttl                       # prefs: namespace, ~30 lines
  patches/
    profile-card-meta.ttl                 # add dct:conformsTo + ldp:constrainedBy to /vault/profile/card.meta
```

No new containers. No bootstrap content beyond the templates themselves.
The `/vault/profile/card` resource exists (CSS-minted at account creation);
the overlay only adds shape conformance metadata to its `.meta` and ships
the enrichment template.

### 3. `PodOwnerWebIDShape`

`sh:targetNode </vault/profile/card#me>` — concrete Pod-owner WebID.
Severity model: spec MUSTs are `sh:Violation`, SHOULDs are `sh:Warning`,
MAYs are `sh:Info`.

**MUST — spec-mandated (sh:Violation):**

| Constraint | Source |
|---|---|
| `rdf:type foaf:Agent` (≥1) | Solid WebID Profile §3.1 |
| `pim:preferencesFile` (=1, IRI) | Solid WebID Profile §4 |

**MUST — operationally required for this Pod (sh:Violation):**

| Constraint | Note |
|---|---|
| `solid:oidcIssuer` (≥1, IRI) | Solid WebID Profile §3.2 "protected" — CSS owns; never PATCH |
| `pim:storage` (≥1, IRI) | Spec is 0+; Pod-owner case requires ≥1 |
| `solid:publicTypeIndex` (=1, IRI) | Type Indexes spec; needed for wiki-memory L3 class-based dispatch (D78) |

**SHOULD — enrichment (sh:Warning):**

| Constraint | Notes |
|---|---|
| `rdf:type foaf:Person` | Spec compliance: CSS-default omits `foaf:Agent`; enrichment adds both |
| `foaf:name` (≥1, xsd:string) | Display name |
| `owl:sameAs <https://orcid.org/...>` (≥1, ORCID-IRI pattern) | Spec-endorsed bridge §3.3; canonical anchor for researchers |
| `owl:sameAs </vault/contacts/Person/<uuid>/index.ttl#this>` (≥1) | L1↔L2 identity equivalence |
| `foaf:isPrimaryTopicOf </vault/wiki/people/<slug>/index.md>` (≥1, IRI) | L1→L3 agentic-memory bridge |

**MAY — rich identity (sh:Info):**

- `org:hasMembership` (0+, IRI → AddressBook Membership)
- `foaf:img`, `foaf:nick`, `foaf:mbox`
- `rdfs:seeAlso` (spec-endorsed generic fallback)

**Forward extension points (commented MAY in v1, sharpened in later sprints):**

- `cred:credentialSubject` — W3C VC 2.0 issued claims about the WebID owner
- `alsoKnownAs <did:web:...>` — DID-WebID bridge (D14)
- `acl:owner` — ACL framework wiring when Phase 6 enables WAC/ACP
- `solid:account` — multi-WebID Pods (shared lab Pod with member WebIDs)

`sh:closed false` — forward-extensible.

`dct:conformsTo <https://solid.github.io/webid-profile/>` documents the
spec source (the published solidproject.org/TR/webid URL 404s; editor's
draft is the live version).

### 4. `PodOwnerPreferencesShape`

`sh:targetNode </vault/settings/prefs.ttl#owner>`. The elicitation contract
that drives the agent↔human walk-through.

**Required facts (sh:Violation):**

| Predicate | Type | Pattern |
|---|---|---|
| `prefs:fullName` | xsd:string | — |
| `prefs:orcid` | xsd:string | `^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$` |
| `prefs:wikiSlug` | xsd:string | `^[a-z0-9-]+$` |

**Optional facts (sh:Info):**

- `prefs:primaryAffiliationROR` — bare ROR id (e.g., `00mkhxb43`)
- `prefs:primaryAffiliationName` — display name of org (fallback if no ROR)
- `prefs:membershipRole` — role at primary org
- `prefs:membershipStart` — xsd:date
- `prefs:additionalAffiliations` — repeat the above for each
- `prefs:email`, `prefs:foafImg`
- `prefs:setupOwnerCompleted` — xsd:boolean marker

`sh:agentInstruction` documents the elicitation protocol:

> 1. `solid-pod read /vault/settings/prefs.ttl`
> 2. For each REQUIRED `prefs:*` predicate not present, ASK THE HUMAN (one
>    question at a time). Don't infer or guess proper nouns.
> 3. After each answer, PATCH `/vault/settings/prefs.ttl` to persist it.
> 4. Once required facts are present, validate against this shape and
>    proceed to AddressBook + WebID + wiki-page write steps.
> 5. Set `prefs:setupOwnerCompleted true^^xsd:boolean` when done.
> The prefs file is private (post-ACL: `acl:owner`-only). Treat its
> contents as the owner's authoritative self-declaration. Don't substitute
> facts gathered from CLAUDE.md or other sources without confirming.

### 5. `webid-enrich.ttl` template

```turtle
<.../webid-enrich.ttl>
    a tmpl:Template ;
    tmpl:validatesAgainst <.../webid-profile.shacl.ttl#PodOwnerWebIDShape> ;
    tmpl:operation        "PATCH" ;
    tmpl:targetResource   </vault/profile/card> ;          # new predicate
    sh:agentInstruction """
      Procedure to enrich Pod-owner WebID — see template body. Placeholders:
        <<FULL_NAME>>     <<ORCID>>     <<CONTACT_CARD>>     <<WIKI_PAGE>>
        <<MEMBERSHIP>>    (optional)
      Patch is INSERT-only (CLI gap). Check existing state via solid-pod read
      first; omit duplicate triples or catch 409 and retry without them.
      PROTECTED triple (Solid WebID Profile §3.2): solid:oidcIssuer must
      never appear in the patch; CSS owns it and PATCH returns 409.
    """ ;
    tmpl:templateBody """
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix org:   <http://www.w3.org/ns/org#> .
@prefix pim:   <http://www.w3.org/ns/pim/space#> .
@prefix wiki:  <https://pod.vardeman.me/vault/ontology/wiki#> .

</vault/profile/card#me>
    a foaf:Agent, foaf:Person ;
    foaf:name              \"<<FULL_NAME>>\" ;
    pim:preferencesFile    </vault/settings/prefs.ttl> ;
    owl:sameAs             <https://orcid.org/<<ORCID>>> ,
                           <<<CONTACT_CARD>>> ;
    foaf:isPrimaryTopicOf  <<<WIKI_PAGE>>> .

# Follow-the-nose: assert the wiki page's type in this response so a single
# dereference of the WebID lets an LLM recognize the L3 agentic-memory record.
<<<WIKI_PAGE>>>  a wiki:Person .

# Optional — include only if a current membership was elicited:
# </vault/profile/card#me> org:hasMembership <<<MEMBERSHIP>>> .
""" .
```

### 6. `prefs-init.ttl` template

PUT-flavor template that creates an empty preferences-file skeleton with
commented placeholders for each `prefs:*` predicate, matching the shape.
Sets the elicitation scaffold so the agent's first patch operations always
target a valid resource.

### 7. apply.py extensions

Two small additions:

1. **Handle `overlay:installsResourceMetaPatch`** — mirrors the existing
   `installsContainerMetaPatch` handler but targets resource `.meta` instead
   of container `.meta`. Applied idempotently.

2. **Recognize PATCH-flavor templates** when surfacing the template catalog
   — `tmpl:operation "PATCH"` paired with `tmpl:targetResource`. No
   functional change to template publishing, just metadata exposure.

### 8. New decisions to ratify

This sprint produces candidates for two new D-numbered decisions:

- **D89 — Owner-identity overlay as substrate-level concern** (above
  AddressBook + wiki-memory). Rationale: identity stack will grow to
  include VCs, DIDs, ACL ownership — these don't belong inside AddressBook.
- **D90 — Agent↔human elicitation via `pim:preferencesFile`.** Rationale:
  spec MUST + private + per-Pod-owner → natural home for setup-state and
  authoritative self-declaration.

---

## Skill specifications (solid-agent-skills)

### Skill 1: `solid-owner-identity`

**Location:** `skills/solid-owner-identity/SKILL.md`

**Frontmatter:**
```yaml
---
name: solid-owner-identity
description: Pod-owner identity operations — WebID profile reads + enrichment,
preferences-file elicitation, and the canonical cold-start "Set up Pod owner"
procedure that orchestrates AddressBook + wiki-memory L3 skills. Use whenever
arriving at a Pod and needing to learn who owns it, when enriching a CSS-minted
minimal WebID, when walking a human through Pod bootstrap, or when reasoning
about Pod-owner identity claims (foaf:name, owl:sameAs <orcid>, org:hasMembership,
foaf:isPrimaryTopicOf the L3 agentic-memory page). Forward-looking: extends to
VC-issued claims (cred:credentialSubject), DID-WebID bridges (alsoKnownAs <did:>),
and ACL ownership wiring as those land in later sprints.
---
```

**Sections:**

- **Quick reference** — substrate URLs (overlay manifest, shapes, templates,
  capabilities); three-layer identity model.
- **Step 1: Discover the owner-identity overlay** — GET storage description,
  look for `cap:pod-owner-identity`; GET capability descriptor; learn
  shape + template URLs.
- **Step 2: Read current Pod-owner state** — `solid-pod read /vault/profile/card`;
  classify CSS-default vs partially-enriched vs fully-enriched.
- **Procedure: Set up Pod owner** — the cross-cutting flow (Phase A-F, see
  below). Calls into `solid-addressbook` (Phase B/C) and
  `solid-wiki-memory-l3` (Phase D).
- **Procedure: Read owner state without modifying** — idempotent inspection.
- **Future extensions (stubs)** — VC issuance, DID-WebID bridge (D14), ACL
  ownership (Phase 6).
- **Known gaps** — PATCH is insert-only (CLI gap); auth pre-ACL only.

### Skill 2: `solid-addressbook`

**Location:** `skills/solid-addressbook/SKILL.md`

**Frontmatter:**
```yaml
---
name: solid-addressbook
description: Solid Pod AddressBook substrate operations — discover, read, and
write SolidOS-compatible vcard contact cards (Person, Organization, Group,
Membership). Use whenever creating or finding contacts in /vault/contacts/,
mining ORCID/ROR/WebID anchors, building time-scoped affiliations via
org:Membership, patching AddressBook index files (people.ttl, groups.ttl),
or invoking find-by-orcid / find-by-name affordances. Each create operation
fetches a tmpl:Template, fills <<PLACEHOLDER>> values, PUTs, and consumes
SHACL ValidationReport on 422 for self-correction.
---
```

**Sections:**

- **Quick reference** — containers + index files; 4 shapes, 5 templates,
  8 read affordances.
- **Step 1: Discover** — storage description → Type Index → `vcard:AddressBook`
  → `/vault/contacts/`.
- **Procedure: Create a Person contact** — fetch contact-create template,
  mint UUIDv4, fill, PUT, patch `/contacts/people.ttl` index.
  Minimum invariant: `vcard:fn + vcard:inAddressBook + ≥1 anchor`. On 422:
  parse SHACL ValidationReport from `text/turtle` response body.
- **Procedure: Create an Organization** — ROR-preferred anchor.
- **Procedure: Create a Membership** — `org:member`, `org:organization`,
  `org:memberDuring`, `org:role`.
- **Procedure: Find contacts** — `solid-pod invoke` against the 8 read
  affordances (find-by-orcid / name / email / affiliation / group / etc.).
- **Procedure: Pod-owner setup contribution** — called by `solid-owner-identity`
  Phase B/C; mints owner Person card, optional Org + Membership from
  prefs.ttl facts.
- **Known gotchas** — `vcard:inAddressBook` resolves against server root not
  vault root (counter-intuitive absolute IRI needed); `Person/` container
  `constrainedBy` blocks sub-containers (flat layout adopted per MEMORY caveat).

### Skill 3: `solid-wiki-memory-l3` (minimal this sprint)

**Location:** `skills/solid-wiki-memory-l3/SKILL.md`

**Frontmatter:**
```yaml
---
name: solid-wiki-memory-l3
description: Wiki-memory L3 (memory profile) operations on a Solid Pod —
class-based wiki page reads/writes, dual-layer linking (markdown wikilinks +
.meta projection per D58/D71), foaf:primaryTopic bridging from wiki pages to
WebID/AddressBook identity. Use whenever working with /vault/wiki/{pages,
sources,people,procedures,working}/, when creating agentic-memory records
that need to be both LLM-readable (markdown) and SPARQL-queryable (.meta
triples), or when bridging a wiki person page to its L1 WebID + L2
AddressBook contact card. Includes the RQ-Pod-4 explicit-source SPARQL
workaround for .meta traversal.
---
```

**Sections (minimal scope this sprint):**

- **Quick reference** — wiki containers + class-based dispatch (Type Index →
  container); 6 shapes (D77); dual-layer linking convention.
- **Step 1: Discover** — storage description → shape catalog + Type Index →
  wiki containers.
- **Concept: Three-layer stratification (D70)** — L1/L2/L3.
- **Concept: Dual-layer linking (D58/D71)** — body wikilinks `[[Note]]{.class}`
  → `.meta` projection by `MarkdownProjectionListener`.
- **Procedure: Read a wiki page** — `solid-pod read` returns markdown body
  + `.meta` projection.
- **Procedure: Create a wiki Person page** — Type Index → container →
  shape → template → fill from prefs + AddressBook URIs → PUT.
- **Procedure: Bridge a wiki person page to identity (L1/L2)** — called by
  `solid-owner-identity` Phase D. In wiki page's `.meta`:
  `foaf:primaryTopic <WebID>` + `owl:sameAs <contact-card-#this>`.
- **Procedure: Query the wiki graph** — `solid-pod sparql` with
  `--default-graph-uri` for the RQ-Pod-4 workaround.
- **Known gaps** — RQ-Pod-4 (Comunica skips describedby on text/markdown);
  RQ-Listener-1 (writeMetadataFile race in Model A).

**Explicitly deferred (Memory Structuring Sprint):**

- Two-stage commit (D73): permissive working-memory shape → `mem:Crystallize`
  → durable container.
- Full coverage of remaining shape classes (wiki:Concept, wiki:Source,
  wiki:Procedure, wiki:WorkingMemory, wiki:Page) — this sprint focuses on
  `wiki:Person` because that's the only class on the setup-owner path.
- Memory-substrate triggers (D74): `mem:*` AS2 vocab on LDN inbox.
- Compile-once procedures (D72).

---

## Cross-cutting setup-owner flow

Owned by `solid-owner-identity::SetupPodOwner`. Calls into the other two
skills as marked. Each phase is idempotent on read — re-running against a
partially-set-up Pod resumes where it left off.

```
caller (human says "set up the Pod owner")
     │
     ▼
solid-owner-identity::SetupPodOwner
     │
     │  Phase A — Preferences elicitation
     │  ─────────────────────────────────
     │  solid-pod read /vault/settings/prefs.ttl                 [200 or 404]
     │  if 404: fetch prefs-init template, PUT skeleton
     │  validate against PodOwnerPreferencesShape
     │  short-circuit if prefs:setupOwnerCompleted = true
     │  for each missing REQUIRED prefs:* predicate:
     │      ASK HUMAN one question (in Claude Code conversation)
     │      solid-pod patch /vault/settings/prefs.ttl --insert "<#owner> prefs:X \"...\" ."
     │  for each ABSENT OPTIONAL prefs:* predicate:
     │      ask human, but accept "skip"; persist if provided
     │
     │  Phase B — AddressBook Person card
     │  ──────────────────────────────────
     ├─►solid-addressbook::CreatePersonContact(prefs)
     │     check /vault/contacts/people.ttl for existing owner ORCID → skip if present
     │     mint UUIDv4 slug
     │     fetch contact-create template, fill from prefs
     │     PUT /vault/contacts/Person/<uuid>.ttl
     │     PATCH /vault/contacts/people.ttl with index entry
     │  returns <contact-card-this-IRI>
     │
     │  Phase C — Optional: Organization + Membership
     │  ─────────────────────────────────────────────
     │  if prefs:primaryAffiliationROR or prefs:primaryAffiliationName present:
     ├─►solid-addressbook::EnsureOrganization(prefs)
     │     sparql for existing org by ROR → return IRI if found, else mint
     │     returns <org-this-IRI>
     ├─►solid-addressbook::CreateMembership(person, org, role, start)
     │     fetch membership-create template, fill
     │     PUT /vault/contacts/Membership/<uuid>.ttl
     │  returns <membership-this-IRI>
     │
     │  Phase D — Optional: wiki person page
     │  ─────────────────────────────────────
     │  if human opts in (ask: "Create the agentic-memory wiki page now?"):
     ├─►solid-wiki-memory-l3::CreatePersonPage(prefs, contact-card-IRI)
     │     mint /vault/wiki/people/<wikiSlug>/index.md (markdown body — minimal seed)
     │     PATCH .meta: a wiki:Person, foaf:primaryTopic <WebID>,
     │                  owl:sameAs <contact-card-#this>
     │  returns <wiki-page-IRI>
     │  (else proceed without — foaf:isPrimaryTopicOf is SHOULD not MUST)
     │
     │  Phase E — WebID enrichment
     │  ───────────────────────────
     │  fetch /vault/meta/templates/webid-enrich.ttl
     │  read /vault/profile/card → identify existing triples (avoid 409 duplicates)
     │  fill template from prefs + contact-card-IRI + (optional) wiki-page-IRI
     │     + (optional) membership-IRI
     │  solid-pod patch /vault/profile/card --insert "<filled body>"
     │  validate by reading back; check against PodOwnerWebIDShape
     │
     │  Phase F — Mark complete
     │  ────────────────────────
     │  solid-pod patch /vault/settings/prefs.ttl
     │      --insert "<#owner> prefs:setupOwnerCompleted true^^xsd:boolean ."
     │  report summary to human (URLs created, fields enriched)
     ▼
done
```

### Idempotence semantics

- Phase A: short-circuits on `prefs:setupOwnerCompleted = true`.
- Phase B: sparql lookup by ORCID before write; skip if owner card exists.
- Phase C: same pattern — check before mint.
- Phase D: 404-check the wiki page before write; ask before overwriting.
- Phase E: read current WebID profile, diff against filled template,
  emit a patch containing only missing triples.

### Failure modes

| Code | Cause | Skill response |
|---|---|---|
| 404 on prefs file | First-run | PUT skeleton from prefs-init template, continue |
| 409 on PATCH | Insert-duplicate (already-present triple) | Drop duplicate from patch, retry |
| 422 on PUT contact card | SHACL violation | Parse `text/turtle` body for `sh:ValidationReport`, fix cited fields, retry |
| 422 on PATCH WebID | shape violation | Same — surface `sh:Warning` to human as advisory; only fix `sh:Violation` |
| Human says "skip" on optional fact | Expected | Continue without persisting; field stays absent in prefs.ttl |
| Human says "skip" on required fact | Setup blocked | Abort with clear message about what's still needed |

---

## Verification / acceptance criteria

A sprint-complete check passes if, against a fresh CSS Pod with the
substrate overlays installed:

1. **Substrate apply.py** runs cleanly with no errors. The new overlay's
   shape, templates, capabilities, and vocab are reachable at their
   declared URLs. `tmpl:targetResource` is in the vocab; `tmpl-vocabulary`
   capability shows v1.1.
2. **Cold-start agent** can invoke `solid-owner-identity` with the prompt
   "set up the Pod owner" against an unenriched Pod and produce, end-to-end:
   - `/vault/settings/prefs.ttl` containing the elicited facts and
     `prefs:setupOwnerCompleted true`.
   - `/vault/contacts/Person/<uuid>.ttl` validating against
     `ContactCardShape`.
   - (If opted in:) `/vault/contacts/Organization/<uuid>.ttl` and
     `/vault/contacts/Membership/<uuid>.ttl`.
   - (If opted in:) `/vault/wiki/people/<slug>/index.md` with `.meta`
     declaring `wiki:Person`, `foaf:primaryTopic <WebID>`, and
     `owl:sameAs <contact-card-#this>`.
   - `/vault/profile/card` validating against `PodOwnerWebIDShape` (all
     MUSTs satisfied; SHOULDs surfaced as warnings if any human-skipped).
3. **Follow-the-nose test:** an LLM dereferencing the enriched WebID
   receives both `foaf:isPrimaryTopicOf <wiki-page>` AND
   `<wiki-page> a wiki:Person` in the same response.
4. **Idempotence:** re-running the setup-owner procedure produces zero
   writes (all phases short-circuit). Logs show "skipping — already
   present" for each phase.
5. **Failure-mode tests:** simulated 409 on PATCH (insert duplicate) is
   caught and recovered; 422 with SHACL ValidationReport surfaces to
   the human as a clear "the substrate rejected this — fix X" message.

---

## Future extensions (out of scope this sprint)

| Extension | Sprint | Trigger |
|---|---|---|
| Verifiable Credentials issuance | Post-Rung-1.5 | When VC tooling lands (Inrupt gConsent or equivalent) |
| DID-WebID bridge (D14) | Post-Rung-1.5 | `alsoKnownAs <did:web:...>` enriches the shape's MAY |
| ACL ownership wiring (Phase 6) | Phase 6 (WAC/ACP turn-on) | Requires choosing ACL framework first (per identity-and-provenance design doc Thread 4) |
| PATCH-with-delete-flavor | Memory Structuring Sprint or later | When updates beyond inserts are needed |
| Two-stage commit (D73) in wiki-memory | Memory Structuring Sprint | `mem:Crystallize` from working/ to durable |
| Full wiki-memory shape coverage | Memory Structuring Sprint | wiki:Source, wiki:Procedure, wiki:Concept, etc. |
| Multi-WebID Pod support | When lab/org Pod use case lands | Per identity-and-provenance design doc Thread 2 |
| Authenticated PATCH (Solid-OIDC + DPoP) | Phase 6 | Required once ACLs are turned on |

---

## References

- Solid WebID Profile editor's draft: https://solid.github.io/webid-profile/
  (the `solidproject.org/TR/webid` URL 404s; editor's draft is live)
- W3C WebID 1.0 (Incubator, 2014): https://www.w3.org/2005/Incubator/webid/spec/identity/
- Solid identity-stack skill: `cogitarelink-solid/.claude/skills/solid-identity-stack/`
  — references covering WebID, Solid-OIDC, DPoP, WAC/ACP, VCs, DIDs,
  multi-WebID Pods, AI-agent identity, PROV-O.
- Identity and provenance design (anchor): `cogitarelink-solid/docs/plans/2026-05-16-identity-and-provenance-design.md`
- AddressBook substrate design (anchor): `cogitarelink-solid/docs/plans/2026-05-16-agentic-addressbook-design.md`
- Capabilities-only overlay deps (D87): `cogitarelink-solid/docs/plans/2026-05-16-capabilities-only-overlay-deps.md`
- Decisions to revisit during implementation: D7, D8, D14, D44, D49, D52,
  D58, D70, D71, D72, D73, D74, D75, D77, D78, D81, D83, D84, D86, D87, D88
- New decision candidates from this sprint:
  - **D89** — Owner-identity overlay as substrate-level concern (above
    AddressBook + wiki-memory).
  - **D90** — Agent↔human elicitation via `pim:preferencesFile`.

---

## Open questions / known unknowns

- **prefs:wikiSlug uniqueness** — what if the suggested slug collides with
  an existing wiki person page? Defer to wiki-memory skill's responsibility
  to disambiguate; if a page already exists at the slug, the agent should
  ask the human (or treat the existing page as the bridge target if it
  has `foaf:primaryTopic <WebID>`).
- **Multi-WebID Pods.** v1 targets single-owner Pods. Multi-WebID semantics
  (shared lab Pod) are explicitly deferred; `sh:targetNode <#me>` assumes
  one Pod-owner WebID.
- **Wiki page seed content.** Phase D writes a minimal markdown seed; what
  should that seed contain? Working answer: H1 with full name, a short
  "Pod-owner agentic-memory record" line, and an open `## Notes` section.
  Refined in Memory Structuring Sprint.
- **Memento behavior on profile-card PATCH.** The MementoCommitListener
  fires on writes to RDF resources. Does the enrichment patch produce a
  useful Memento snapshot? Working assumption: yes, and the resulting
  TimeMap captures the pre/post enrichment states. Verify during
  implementation.

---

## Implementation order (preview — full plan via writing-plans next)

1. Substrate vocab extension (`tmpl:targetResource`) + capability bump.
2. New overlay scaffolding (manifest, vocab, capabilities — but not yet
   functional shapes/templates).
3. `PodOwnerPreferencesShape` + `prefs-init.ttl` template + skeleton check.
4. `PodOwnerWebIDShape` + `webid-enrich.ttl` template.
5. apply.py extensions (`installsResourceMetaPatch`).
6. Run apply.py end-to-end; verify substrate is queryable.
7. Skill 1 — `solid-addressbook` SKILL.md (atomic procedures).
8. Skill 2 — `solid-wiki-memory-l3` SKILL.md (minimal scope).
9. Skill 3 — `solid-owner-identity` SKILL.md including setup-owner orchestration.
10. End-to-end run against fresh Pod; capture telemetry; iterate on
    `sh:agentInstruction` text based on observed agent behavior.
11. Ratify D89 + D90 if implementation confirms the design.
