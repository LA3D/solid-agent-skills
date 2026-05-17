---
name: solid-owner-identity
description: Pod-owner identity operations — WebID profile reads + enrichment, preferences-file elicitation, and the canonical cold-start "Set up Pod owner" procedure that orchestrates AddressBook + wiki-memory L3 skills. Use whenever arriving at a Pod and needing to learn who owns it, when enriching a CSS-minted minimal WebID, when walking a human through Pod bootstrap, or when reasoning about Pod-owner identity claims (foaf:name, owl:sameAs <orcid>, org:hasMembership, foaf:isPrimaryTopicOf the L3 agentic-memory page). Forward-looking: extends to VC-issued claims (cred:credentialSubject), DID-WebID bridges (alsoKnownAs <did:>), and ACL ownership wiring as those land in later sprints.
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
