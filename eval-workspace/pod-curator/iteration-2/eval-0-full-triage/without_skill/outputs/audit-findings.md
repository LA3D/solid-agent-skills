# pod-audit report — https://pod.vardeman.me/vault/

**0 ERROR · 11 WARN · 0 INFO**

## WARN (11)
- **StorageDescriptionShape:agentInstruction** — Storage description should carry an entry-point sh:agentInstruction telling arriving agents how to use the catalog pointers (D104 sweep item).
  - `https://pod.vardeman.me/vault/`
  - _fix_: Patch the resource's .meta to satisfy the shape.
- **resolve:seeAlso** — seeAlso target does not resolve (got 404).
  - `https://pod.vardeman.me/vault/wiki/pages/`
  - _fix_: Stale pointer — update or remove it (Type Index already routes containers).
- **resolve:seeAlso** — seeAlso target does not resolve (got 404).
  - `https://pod.vardeman.me/vault/wiki/sources/`
  - _fix_: Stale pointer — update or remove it (Type Index already routes containers).
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/contact-find-by-name.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/bridge-card-to-wiki.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/contact-find-by-group.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/contact-find-by-email.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/contact-find-by-affiliation.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/org-find-by-ror.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/contact-find-by-orcid.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
- **descriptor:untyped** — Catalog entry is not typed prof:ResourceDescriptor, so it escapes the descriptor contract (no role/label/conformsTo/installedBy enforced).
  - `https://pod.vardeman.me/vault/meta/affordances/org-find-by-name.ttl`
  - _fix_: Add 'a prof:ResourceDescriptor' plus prof:hasRole, rdfs:label, dct:conformsTo, wiki:installedBy to bring it under governance.
