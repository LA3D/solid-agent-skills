---
name: link
description: Add a typed cross-reference edge between two wiki-memory resources by PATCHing the subject's .meta. Use when the user says 'link X to Y', 'X extends Y', 'X supports Y', 'X cites Y', 'add a cites edge from X to Y', or any phrasing that implies establishing a typed relationship between two durable resources. Only substrate-governed predicates (per D81 — listed in the subject class shape's wiki:governs) are accepted; the substrate rejects ungoverned predicates with 422.
---

# link

## When to use

When establishing a typed relationship between two durable wiki-memory resources.
Trigger phrases: "link X to Y", "X extends Y", "X supports Y", "X cites Y",
"add a broader relation from X to Y", "connect X to Y with a cito:cites edge".

Common predicates (governed by class shapes per D81):
- `wiki:extends` — X builds on Y
- `wiki:supports` — X provides evidence for Y
- `wiki:criticizes` — X challenges or opposes Y
- `cito:cites` — X cites Y as a source
- `skos:broader` — X is narrower in scope than Y
- `skos:related` — X and Y are associatively related

Exact list per the subject resource's class shape's `wiki:governs` — always check
before patching (step 2).

Do NOT use for:
- Predicates not in the class shape's `wiki:governs` list: the PATCH will fail with 422
- Links from/to working notes: crystallize first
- Relationships expressed in body wikilinks — those are projected by the substrate automatically (D58/D71); this skill is for explicit `.meta` edges beyond what body projection covers

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/link --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **Inspect the subject's current `.meta` edges:**
   ```bash
   solid-pod read <subject-url>.meta --accept text/turtle
   ```
   Check if the edge already exists. If `<subject-url> <predicate> <object-url>` is
   already present, no action is needed — report this to the user.

2. **Verify the chosen predicate is substrate-governed for the subject's class.**
   Find the class shape — typically at `<pod>/vault/meta/shapes/<class-name>.ttl`:
   ```bash
   solid-pod read <subject-class-shape-url> --accept text/turtle
   ```
   Locate the `wiki:governs` list in the shape. If the chosen predicate is NOT listed,
   abort with a clear error: "Predicate `<predicate>` is not in `wiki:governs` for
   `<class>`. Allowed predicates: [list]." Do not attempt the PATCH.

3. **Compose an N3 Patch body file** (e.g., `link-patch.n3`):
   ```turtle
   @prefix solid: <http://www.w3.org/ns/solid/terms#> .
   @prefix mem:   <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix prov:  <http://www.w3.org/ns/prov#> .
   @prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .

   <> a solid:InsertDeletePatch ;
       solid:inserts {
           <subject-url> <predicate> <object-url> .
           <subject-url> prov:wasGeneratedBy [
               a mem:LinkAction, prov:Activity ;
               prov:wasAssociatedWith <agent-webid> ;
               prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
           ] .
       } .
   ```

4. **Apply the PATCH:**
   ```bash
   solid-pod patch <subject-url>.meta --body link-patch.n3
   ```
   On HTTP 422 with `sh:ValidationReport`: surface the report; the predicate may be
   ungoverned for this resource's actual class (check step 2 output carefully).

5. **POST the LinkAction announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:LinkAction ;
       as:actor    <agent-webid> ;
       as:object   <subject-url> ;
       as:target   <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **PATCH returns 422 with `sh:ValidationReport`:** The predicate is ungoverned for this
  class — the substrate enforces predicate-level governance (D81). Surface the
  `sh:resultMessage` entries to the user. No edge was added.
- **Object URL is not dereferenceable:** The PATCH may succeed (the substrate doesn't
  validate that the object URL exists), but the resulting edge is a dangling reference.
  Warn the user and verify the object URL before linking.
- **Predicate check (step 2) fails because shape URL is not known:** Discover the shape
  via the class's Type Index entry: `solid-pod read <pod>/vault/settings/publicTypeIndex`
  and follow `solid:forClass` → container → `.meta` → `ldp:constrainedBy`.
- **Announcement POST fails:** Log and continue. The edge IS in `.meta`; the log entry
  is missing.

## References

- Affordance descriptor: `/vault/meta/affordances/link`
- Action class: `/vault/ontology/mem#LinkAction`
- Predicate-level governance: D81 (Model A)
- Body-affordance projection: D58/D71 (wikilinks in body → `.meta` triples, automatic)
- L3 reference profile entry point: `/vault/wiki/index.md`
