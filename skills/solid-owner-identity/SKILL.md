---
name: solid-owner-identity
description: >-
  Pod-owner identity operations — WebID profile reads + enrichment,
  preferences-file elicitation, and the canonical cold-start "Set up Pod owner"
  procedure that orchestrates AddressBook + wiki-memory L3 skills. Use whenever
  arriving at a Pod and needing to learn who owns it, when enriching a CSS-minted
  minimal WebID, when walking a human through Pod bootstrap, or when reasoning
  about Pod-owner identity claims (foaf:name, owl:sameAs <orcid>,
  org:hasMembership, foaf:isPrimaryTopicOf the L3 agentic-memory page).
  Forward-looking: extends to VC-issued claims (cred:credentialSubject),
  DID-WebID bridges (alsoKnownAs <did:>), and ACL ownership wiring as those
  land in later sprints.
---

# Pod-Owner Identity Operations

The Pod-owner WebID at `/vault/profile/card#me` is the canonical agent identity of the Pod. CSS mints a minimal version on account creation (foaf:Person, oidcIssuer, storage, publicTypeIndex). This skill enriches it through the agent↔human elicitation pattern and orchestrates the cross-cutting **Set up Pod owner** procedure that wires the three identity layers together.

## Quick reference

| Substrate URL | Role |
|---|---|
| `/vault/meta/overlays/owner-identity/manifest.ttl` | Overlay manifest (D87 capabilities-only deps) |
| `/vault/meta/shapes/webid-profile.shacl.ttl#PodOwnerWebIDShape` | WebID profile SHACL contract |
| `/vault/meta/shapes/pod-owner-preferences.shacl.ttl#PodOwnerPreferencesShape` | Elicitation contract for /vault/settings/prefs.ttl |
| `/vault/meta/templates/webid-enrich.ttl` | PATCH template (first tmpl:targetResource consumer) |
| `/vault/meta/templates/prefs-init.ttl` | PUT template — prefs-file skeleton |
| `/vault/meta/capabilities/pod-owner-identity.ttl` | Top-level capability descriptor |
| `/vault/ontology/owner-prefs` | `prefs:` vocabulary |

## Concept — Three-layer Pod-owner identity

| Layer | Artifact | Role | URL |
|---|---|---|---|
| **L1** | WebID profile | Canonical identity, auth, spec-required | `/vault/profile/card#me` |
| **L2** | AddressBook contact card | vcard, time-scoped affiliations, app-compat | `/vault/contacts/Person/<uuid>.ttl#this` |
| **L3** | Wiki person page | Agentic memory — markdown + concept edges + sources | `/vault/wiki/people/<slug>/index.md` |

All three IRIs denote the same agent. Bridge predicates make the equivalence explicit:

- L1→ORCID: `owl:sameAs <https://orcid.org/...>` (spec-endorsed §3.3)
- L1→L2: `owl:sameAs <contact-#this>`
- L1→L3: `foaf:isPrimaryTopicOf <wiki-page>` + inlined `<wiki-page> a wiki:Person` (follow-the-nose)
- L3→L1: `foaf:primaryTopic <WebID>` in wiki page's `.meta`
- L2→L1: `vcard:url [ vcard:WebId ; vcard:value <WebID> ]` (SolidOS convention, optional)

## Step 1 — Discover the owner-identity overlay

```
solid-pod info /vault/
   → storage description carries dct:conformsTo + provided capabilities
solid-pod read /vault/meta/capabilities/pod-owner-identity.ttl
   → cap:providedBy <ontology/overlay#owner-identity>
solid-pod read /vault/meta/shapes/webid-profile.shacl.ttl
   → PodOwnerWebIDShape with the agentInstruction text (read this!)
```

## Step 2 — Read current Pod-owner state

```
solid-pod read /vault/profile/card
```

Classify the result:

- **CSS-default minimal**: only `foaf:Person`, `solid:oidcIssuer`, `pim:storage`, `solid:publicTypeIndex`. → Full SetupPodOwner needed.
- **Partially enriched**: some subset of (`foaf:name`, `owl:sameAs`, `foaf:isPrimaryTopicOf`, `pim:preferencesFile`). → Resume from the first missing required predicate.
- **Fully enriched**: all MUSTs satisfied (foaf:Agent, pim:preferencesFile, oidcIssuer, storage, publicTypeIndex) AND `prefs:setupOwnerCompleted = true` at /vault/settings/prefs.ttl. → Report state, exit.

```
solid-pod read /vault/settings/prefs.ttl       # 200 + facts, or 404
```

If 404 or empty: this is a fresh Pod; SetupPodOwner Phase A creates it.
If 200 + setupOwnerCompleted: short-circuit; this skill's job is done.

## Procedure — Set up Pod owner (Phases A–F)

The cross-cutting flow. Each phase is idempotent on read; re-runs resume cleanly.

### Phase A — Preferences elicitation

The goal: produce a `/vault/settings/prefs.ttl` file conforming to `PodOwnerPreferencesShape` with the required facts (`prefs:fullName`, `prefs:orcid`, `prefs:wikiSlug`) populated from the human's answers.

```
1. solid-pod read /vault/settings/prefs.ttl
   404 → fetch prefs-init template, PUT skeleton:
       solid-pod read /vault/meta/templates/prefs-init.ttl
       (copy tmpl:templateBody verbatim — no placeholders to fill)
       solid-pod create /vault/settings/ --slug prefs.ttl \
           --content-type text/turtle --body "<template body>"
   200 → parse existing facts; check for prefs:setupOwnerCompleted = true → SHORT-CIRCUIT

2. For each REQUIRED predicate from PodOwnerPreferencesShape:
   - prefs:fullName    — "What's the Pod owner's full display name?"
   - prefs:orcid       — "What's their ORCID id? (format: XXXX-XXXX-XXXX-XXXX, X may be a digit or X)"
   - prefs:wikiSlug    — Suggest from fullName (lowercase first name or last name). Ask:
                         "Wiki slug for /vault/wiki/people/<slug>/? Default: <suggestion>"

   For each answer, PATCH /vault/settings/prefs.ttl:
       solid-pod patch /vault/settings/prefs.ttl --insert "
           @prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
           </vault/settings/prefs.ttl#owner> prefs:<PREDICATE> \"<VALUE>\" .
       "

3. For OPTIONAL predicates (affiliation/role/dates/email/avatar): ask, accept "skip":
   - "Current primary institutional affiliation? (ROR id if known, else display name; skip is OK)"
   - "Role at that affiliation? (skip OK)"
   - "Start date of that affiliation? (YYYY-MM-DD; skip OK)"
   - "Work email? (skip OK)"
   - "Avatar URL? (skip OK)"

   Persist any non-skipped answers via the same PATCH pattern.

4. Validate prefs.ttl against PodOwnerPreferencesShape (offline with pyshacl,
   or trust the substrate to enforce on next write). If MUSTs unsatisfied,
   re-ask the missing field.
```

**Important** (agentInstruction reminder): don't infer or guess proper nouns. CLAUDE.md / project memory may suggest a name or ORCID, but **the prefs file is the owner's authoritative self-declaration**. Ask before persisting.

### Phase B — AddressBook Person card

Calls into the **`solid-addressbook`** skill ("Procedure — Pod-owner setup contribution"). The flow:

```
1. Check for existing owner card:
   solid-pod sparql https://pod.vardeman.me/vault/ "
     PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
     PREFIX owl: <http://www.w3.org/2002/07/owl#>
     SELECT ?card WHERE {
       ?card a vcard:Individual ;
             vcard:inAddressBook <https://pod.vardeman.me/vault/contacts/index.ttl#this> ;
             owl:sameAs <https://orcid.org/<prefs:orcid>> .
     }
   " --default-graph-uri https://pod.vardeman.me/vault/contacts/people.ttl
   → if 1+ result, capture <contact-card-IRI> and SKIP step 2.

2. Mint Person card via solid-addressbook procedure:
   - read /vault/meta/templates/contact-create.ttl
   - mint UUIDv4 slug
   - fill <<FULL_NAME>>=prefs:fullName, <<ORCID>>=prefs:orcid
   - solid-pod create /vault/contacts/Person/ --slug <uuid>.ttl ...
   - solid-pod patch /vault/contacts/people.ttl --insert "<#book> vcard:fn ... ; vcard:hasMember ... ."
   - capture <contact-card-IRI> = https://pod.vardeman.me/vault/contacts/Person/<uuid>.ttl#this
```

### Phase C — Optional: Organization + Membership

Run only if `prefs:primaryAffiliationROR` OR `prefs:primaryAffiliationName` present in prefs.ttl.

```
1. Ensure Organization exists:
   if prefs:primaryAffiliationROR present:
       solid-pod sparql ... "SELECT ?org WHERE { ?org owl:sameAs <https://ror.org/<ROR>> . }"
       → if exists, capture <org-IRI>; else mint via org-create template
   else (only name): always mint (no canonical anchor to dedupe against)

2. Mint Membership (always — even if Org existed, this is a new owner-to-org link):
   - check for existing Membership: SPARQL for ?m where ?m org:member <contact-card-IRI> + org:organization <org-IRI>
   - if exists, capture <membership-IRI>; SKIP mint
   - else: read membership-create template, fill placeholders, PUT
   - capture <membership-IRI> = https://pod.vardeman.me/vault/contacts/Membership/<uuid>.ttl#this
```

Phase C is **fully optional** — if the human skips affiliation facts in Phase A, skip Phase C entirely. The WebID enrichment in Phase E omits `org:hasMembership` cleanly.

### Phase D — Optional: wiki Person page + bridge

Ask the human: *"Create the L3 agentic-memory wiki page now? (Recommended — gives LLMs richer context about the Pod owner; can be created later via solid-wiki-memory-l3 if you prefer.)"*

If yes:

```
1. Check for existing wiki page:
   solid-pod read /vault/wiki/people/<prefs:wikiSlug>/index.md
   200 → check its .meta for foaf:primaryTopic <WebID>
         if present: capture <wiki-page-IRI>; SKIP step 2.
         if absent: ask human — overwrite the page's bridge or pick a different slug?
   404 → proceed to mint.

2. Calls into solid-wiki-memory-l3 skill ("Procedure — Create a wiki Person page"):
   - mint markdown body (minimal seed; H1 = prefs:fullName; "Pod-owner agentic-memory record")
   - solid-pod create /vault/wiki/people/ --slug <wikiSlug>/index.md \
       --content-type text/markdown --body "<markdown>" \
       --meta "<> a wiki:Person ; foaf:name <fullName> ; \
               foaf:primaryTopic </vault/profile/card#me> ; \
               owl:sameAs <contact-card-IRI> ."
   - capture <wiki-page-IRI> = /vault/wiki/people/<wikiSlug>/index.md
```

If no: proceed to Phase E without a wiki page IRI. The WebID enrichment omits `foaf:isPrimaryTopicOf` cleanly — it's SHOULD, not MUST, so the shape surfaces a `sh:Warning` but doesn't block.

### Phase E — WebID enrichment

The core. PATCH `/vault/profile/card` with the substrate-shipped template.

```
1. solid-pod read /vault/meta/templates/webid-enrich.ttl
   → capture tmpl:templateBody (with <<FULL_NAME>>, <<ORCID>>, <<CONTACT_CARD>>,
     <<WIKI_PAGE>>, <<MEMBERSHIP>> placeholders)

2. solid-pod read /vault/profile/card  → list existing triples

3. Substitute placeholders from prefs.ttl + Phase B/C/D outputs:
   <<FULL_NAME>>     = prefs:fullName
   <<ORCID>>         = prefs:orcid (bare; template body adds https://orcid.org/ prefix)
   <<CONTACT_CARD>>  = full IRI from Phase B
   <<WIKI_PAGE>>     = full IRI from Phase D  (omit BOTH foaf:isPrimaryTopicOf and the
                       inlined <wiki-page> a wiki:Person triples if Phase D was skipped)
   <<MEMBERSHIP>>    = full IRI from Phase C  (uncomment the optional org:hasMembership
                       triple only if Phase C ran)

4. Filter out duplicates against the current /vault/profile/card content:
   - If pim:preferencesFile already present, drop it.
   - If foaf:Agent already in rdf:type list, drop the `a foaf:Agent` triple.
   - Similarly for foaf:Person, foaf:name (if value identical), etc.

5. solid-pod patch /vault/profile/card --insert "<filtered body>"
   - 200/205 → success
   - 409 → drop the named duplicate triple and retry
   - 422 → parse sh:ValidationReport. sh:Violation findings are MUSTs — fix
           and retry. sh:Warning findings are SHOULDs — report to human, don't
           block.

6. Verify by reading back:
   solid-pod read /vault/profile/card
   → confirm foaf:Agent, foaf:name, pim:preferencesFile, owl:sameAs (ORCID + contact),
     foaf:isPrimaryTopicOf (if Phase D ran), org:hasMembership (if Phase C ran).
```

### Phase F — Mark setup complete

```
solid-pod patch /vault/settings/prefs.ttl --insert "
    @prefix prefs: <https://pod.vardeman.me/vault/ontology/owner-prefs#> .
    @prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
    </vault/settings/prefs.ttl#owner> prefs:setupOwnerCompleted true^^xsd:boolean .
"
```

Then report to the human, including:
- WebID IRI: `<pod-url>/vault/profile/card#me`
- Contact card IRI: from Phase B
- Org / Membership IRIs (if Phase C ran)
- Wiki page IRI (if Phase D ran)
- Any `sh:Warning` findings that the human chose to skip — these can be filled in later via incremental PATCH (just rerun this skill against the partial state).

## Failure modes

| Code | Cause | Response |
|---|---|---|
| 404 on prefs file | First-run | PUT skeleton, continue |
| 409 on PATCH | Duplicate insert | Drop duplicate, retry |
| 422 on PUT contact card | SHACL violation | Parse `text/turtle` body, fix, retry |
| 422 on PATCH WebID | Shape violation | Fix MUSTs; surface SHOULDs as advisory |
| Human says "skip" on optional fact | Expected | Continue, omit corresponding triple |
| Human says "skip" on required fact | Setup blocked | Abort with clear message — re-run when ready |

## Future extensions (deferred, not implemented v1)

The owner-identity shape's `sh:agentInstruction` already names these as extension points:

| Extension | Trigger to implement | Notes |
|---|---|---|
| **Verifiable Credentials** (`cred:credentialSubject`) | When VC tooling lands (Inrupt gConsent or equivalent) | The WebID is the subject; VC-gated access via `acp:vc` matchers needs ACP not WAC. |
| **DID-WebID bridge** (D14: `alsoKnownAs <did:web:...>`) | When federation matters | DID Core spec endorses `alsoKnownAs` for DID→other-identifier direction; pair with `owl:sameAs` for the reverse. |
| **ACL ownership** (`acl:owner`) | Phase 6 (WAC/ACP turn-on) | Wires the WebID as resource owner across the Pod. |
| **Multi-WebID Pods** (`solid:account`) | Lab/org-Pod use case | Per-member subtree control via `acl:Control`; org WebID owns the Pod. |

Each is a shape MAY extension + a new template + an incremental skill addition. No substrate restructuring needed.

## Known gaps

- **PATCH is insert-only** (CLI/template limitation). To replace an existing triple (e.g., updating `foaf:name` after a name change), a future `webid-update.ttl` template using `solid:deletes` is needed.
- **Authentication pre-ACL only**. Once Phase 6 enables ACLs, every operation here will require Solid-OIDC + DPoP-bound tokens with the authenticated agent == `/vault/profile/card#me`. CLI client doesn't yet have auth wired (uses plain `fetch()`).
- **`pim:preferencesFile` is private but unenforced**. The substrate marks it private by convention; ACL enforcement lands with Phase 6.
- **Wiki Person slug collisions**. If two Pod owners share a slug (unlikely on a single-owner Pod), the agent should disambiguate before overwriting. This skill's Phase D documents the policy but doesn't enforce it.
