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
