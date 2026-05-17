---
name: solid-addressbook
description: Solid Pod AddressBook substrate operations — discover, read, and write SolidOS-compatible vcard contact cards (Person, Organization, Group, Membership). Use whenever creating or finding contacts in /vault/contacts/, mining ORCID/ROR/WebID anchors, building time-scoped affiliations via org:Membership, patching AddressBook index files (people.ttl, groups.ttl), or invoking find-by-orcid / find-by-name affordances. Each create operation fetches a tmpl:Template, fills <<PLACEHOLDER>> values, PUTs, and consumes SHACL ValidationReport on 422 for self-correction.
---

# AddressBook Substrate Operations

SolidOS-compatible vcard contact directory at `/vault/contacts/`. Four
shape classes (Person/Organization/Group/Membership), five create
templates, eight read affordances. Each write is template-driven: the
substrate ships the body skeleton + agent-instruction; you fill placeholders
+ PUT/PATCH.

## Quick reference

| Container | Class | URL |
|---|---|---|
| Person | `vcard:Individual` (also `foaf:Person`) | `/vault/contacts/Person/<uuid>.ttl#this` |
| Organization | `vcard:Organization` (also `foaf:Organization`) | `/vault/contacts/Organization/<uuid>.ttl#this` |
| Group | `vcard:Group` | `/vault/contacts/Group/<slug>.ttl#this` |
| Membership | `org:Membership` | `/vault/contacts/Membership/<uuid>.ttl#this` |

| Index file | Role |
|---|---|
| `/vault/contacts/index.ttl#this` | `vcard:AddressBook` root |
| `/vault/contacts/people.ttl` | `vcard:nameEmailIndex` — Persons + Orgs by `vcard:fn` |
| `/vault/contacts/groups.ttl` | `vcard:groupIndex` |

Shape catalog: `/vault/meta/shapes/{contact-card,organization-card,group,membership}.shacl.ttl`
Templates: `/vault/meta/templates/{contact-create,contact-update,org-create,group-create,membership-create}.ttl`
Read affordances: `/vault/meta/affordances/{contact-find-by-name,contact-find-by-orcid,contact-find-by-email,contact-find-by-affiliation,contact-find-by-group,org-find-by-name,org-find-by-ror,bridge-card-to-wiki}.ttl`

## Step 1 — Discover the AddressBook

```
solid-pod info https://pod.vardeman.me/vault/
   → storage description carries wiki:typeIndex pointer
solid-pod read /vault/settings/publicTypeIndex
   → solid:forClass vcard:AddressBook ; solid:instance </vault/contacts/index.ttl#this>
solid-pod read /vault/contacts/
   → ldp:contains lists Person/, Organization/, Group/, Membership/ + index files
solid-pod shapes /vault/meta/shapes/
   → SHACL shapes (with sh:agentInstruction guidance)
```

The Type Index hop is what makes the AddressBook discoverable across
unrelated Pods — any Pod registering `vcard:AddressBook` in its Type Index
exposes the same contract.

## Procedure — Create a Person contact

The contact-create template ships the body skeleton + a `sh:agentInstruction`
with the exact placeholder list. Follow that instruction, but the high-level
shape is:

```
solid-pod read /vault/meta/templates/contact-create.ttl
  → returns: tmpl:templateBody  (with <<FULL_NAME>>, <<ORCID>>, <<EMAIL>>, ...)
             tmpl:targetContainer </vault/contacts/Person/>
             tmpl:slugAlgorithm "uuid4"
             sh:agentInstruction "Generate UUIDv4, PUT to <target>/<uuid>.ttl, patch index..."

mint UUIDv4 (Python: import uuid; uuid.uuid4().hex with dashes)
fill placeholders from elicited facts
solid-pod create /vault/contacts/Person/ --slug <uuid>.ttl \
    --content-type text/turtle --body "<filled body>" \
    --meta "<#this> a vcard:Individual ."     # optional; shape covers main constraints
solid-pod patch /vault/contacts/people.ttl --insert "
    <#book> <http://www.w3.org/2006/vcard/ns#fn> \"<FULL_NAME>\" ;
            <http://www.w3.org/2006/vcard/ns#hasMember> </vault/contacts/Person/<uuid>.ttl#this> .
"
```

**Minimum invariant** (ContactCardShape enforces): `vcard:fn` + `vcard:inAddressBook` + at least one anchor (`owl:sameAs <orcid>` preferred, `vcard:hasEmail`, or `vcard:hasTelephone`).

**On HTTP 422:** the response body is `text/turtle` carrying an `sh:ValidationReport`. Parse it, read `sh:focusNode` / `sh:resultPath` / `sh:resultMessage`, fix the cited fields, retry the PUT.

**Counter-intuitive constraint** (MEMORY caveat): the `vcard:inAddressBook` value resolves against the *server root*, not the vault root. Cards must use the absolute IRI `https://pod.vardeman.me/vault/contacts/index.ttl#this` (not `</contacts/index.ttl#this>`) to validate.

**Flat layout, not per-person sub-containers** (MEMORY caveat): the `Person/` container has `ldp:constrainedBy` pointing at ContactCardShape, which CSS interprets as blocking sub-container creation. So Person cards live at `/contacts/Person/<uuid>.ttl`, not `/contacts/Person/<uuid>/index.ttl`. Attachment workflows that need a per-person directory must use a separate constrained container (deferred).

**Authoritative anchor preference** (substrate convention): for researchers, `owl:sameAs <https://orcid.org/...>` is the canonical join key — pick it over email when both are known. ORCID enables cross-Pod identity reconciliation; email doesn't.

## Procedure — Create an Organization

Same pattern as Person via `org-create` template. Anchor preference: `owl:sameAs <https://ror.org/<ROR_ID>>` for institutional orgs; `vcard:hasURL` fallback for commercial/informal orgs without ROR. ROR IDs are bare (no URI prefix in template; the template body adds `https://ror.org/`).

```
solid-pod read /vault/meta/templates/org-create.ttl
mint UUIDv4
fill <<ORGANIZATION_NAME>>, <<ROR>> (or <<HOMEPAGE>>)
solid-pod create /vault/contacts/Organization/ --slug <uuid>.ttl --content-type text/turtle --body "<filled>"
solid-pod patch /vault/contacts/people.ttl --insert "<#book> vcard:fn \"<NAME>\" ; vcard:hasMember </vault/contacts/Organization/<uuid>.ttl#this> ."
```

Orgs are co-listed in `people.ttl` with Persons (SolidOS unified name-lookup convention) — single name-emails-index serves both.

## Procedure — Create a Membership (Person ↔ Org with date range)

`org:Membership` reifies the relationship "Person X is a member of Org Y from date A to date B, in role R." Distinct from a flat `vcard:organization-name "Notre Dame"` literal — supports time-scoped affiliations and SPARQL graph traversal.

```
solid-pod read /vault/meta/templates/membership-create.ttl
mint UUIDv4
fill <<PERSON_UUID>>, <<ORG_UUID>>, <<ROLE>>, <<START_DATE>>, optionally <<END_DATE>>
solid-pod create /vault/contacts/Membership/ --slug <uuid>.ttl --content-type text/turtle --body "<filled>"
```

The membership-create template generates a body like:

```turtle
<#this> a <http://www.w3.org/ns/org#Membership> ;
    <http://www.w3.org/ns/org#member>       </vault/contacts/Person/<PERSON_UUID>.ttl#this> ;
    <http://www.w3.org/ns/org#organization> </vault/contacts/Organization/<ORG_UUID>.ttl#this> ;
    <http://www.w3.org/ns/org#memberDuring> [
        <http://www.w3.org/2006/time#hasBeginning>
          [ <http://www.w3.org/2006/time#inXSDDate> "<START_DATE>"^^<http://www.w3.org/2001/XMLSchema#date> ]
    ] ;
    <http://www.w3.org/ns/org#role> "<ROLE>" .
```

After PUT, the Membership IRI (`#this` fragment) becomes the value used in `org:hasMembership` triples on the Person's WebID and/or contact card.

## Procedure — Find contacts (via affordances)

The substrate ships eight read affordances under `/vault/meta/affordances/`. Each declares a `wiki:selectQuery` parameterized SPARQL. Invoke with `solid-pod invoke`:

```
solid-pod invoke https://pod.vardeman.me/vault/ contact-find-by-orcid \
    --default-graph-uri https://pod.vardeman.me/vault/contacts/people.ttl \
    --default-graph-uri https://pod.vardeman.me/vault/contacts/Person/<any>.ttl
```

The affordances:

| Name | Inputs | Returns |
|---|---|---|
| `contact-find-by-orcid` | ORCID URI | Person card IRI |
| `contact-find-by-email` | mailto: URI | Person card IRI |
| `contact-find-by-name` | substring | matching Person/Org IRIs |
| `contact-find-by-affiliation` | Org IRI | Persons with active membership |
| `contact-find-by-group` | Group IRI | Group members |
| `org-find-by-name` | substring | Org IRIs |
| `org-find-by-ror` | ROR URI | Org IRI |
| `bridge-card-to-wiki` | card #this IRI | wiki page IRI via foaf:isPrimaryTopicOf |

**RQ-Pod-4 caveat:** Comunica skips `describedby` Link headers on `text/markdown` resources. For affordances querying `.meta` content, pass explicit `--default-graph-uri` arguments pointing at the relevant `.meta` URLs (the affordance's `sh:agentInstruction` typically lists which graphs to load).

**For programmatic use** (e.g., setup-owner Phase B checking "does an owner card already exist?"): prefer `solid-pod sparql` with an explicit query over the `find-by-orcid` invocation — the affordance does the same query, but a custom SELECT lets you control output shape exactly.
