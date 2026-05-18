---
name: supersede
description: Replace an existing durable wiki-memory resource with a refined version, preserving the prior version via Memento and recording supersession via prov:wasRevisionOf. Use when the user says 'supersede X with this', 'replace X', 'update X with a new version', or when a durable concept needs a refined statement that keeps the same URL identity. The substrate captures the prior version automatically via the Memento extension; the skill records prov:wasRevisionOf pointing at the Memento URI.
---

# supersede

## When to use

When a durable resource needs substantive content replacement at the same URL identity.
Trigger phrases: "supersede X with this", "replace X", "update X with a new version",
"this supersedes the old statement of X".

Use supersede when:
- The URL should remain stable (same concept, same identity)
- The new content substantively rewrites the old (not a minor correction)
- Keeping history via Memento is important

Do NOT use for:
- Full delete-and-replace at a new URL: use archive + crystallize
- Small edits that don't change the resource's identity: use a normal PATCH (no memory action needed)
- Working notes: use crystallize to promote, then supersede if needed post-crystallization

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/supersede --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **Read the existing durable resource:**
   ```bash
   solid-pod read <durable-url>
   ```
   Capture the response Link headers — specifically `rel="timegate"` or `rel="memento"`.

2. **Discover the prior-version Memento URI** from the Link headers.
   The Memento extension on the Pod emits `Link: <timegate-url>; rel="timegate"` and
   the latest `Link: <memento-url>; rel="memento"` for versioned resources.
   Record the Memento URI — this becomes `prov:wasRevisionOf`.

3. **Compose the refined body and `.meta`.** The `.meta` must include:
   - All still-valid predicates from the prior version (title, creator, class, etc.)
   - Supersession provenance:
     ```turtle
     @prefix prov: <http://www.w3.org/ns/prov#> .
     @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
     @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

     <durable-url> prov:wasGeneratedBy [
         a mem:SupersedeAction, prov:Activity ;
         prov:wasAssociatedWith <agent-webid> ;
         prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
     ] .
     <durable-url> prov:wasRevisionOf <prior-memento-uri> .
     ```

4. **PUT the refined resource:**
   ```bash
   solid-pod create <durable-url> --body <body-file> --meta <meta-file>
   ```
   On HTTP 422 with `sh:ValidationReport`: surface the report to the user and abort.
   The prior version remains intact (Memento still holds it).

5. **POST the SupersedeAction announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:SupersedeAction ;
       as:actor  <agent-webid> ;
       as:object <durable-url> ;
       as:target <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **SHACL rejection on PUT (422):** Surface the `sh:ValidationReport` to the user and abort.
  Prior version is intact — Memento preserves it, and the current URL still points to the
  old content.
- **Memento URI lookup fails (no `rel="timegate"` in headers):** Proceed without
  `prov:wasRevisionOf` but warn the user that provenance chaining is incomplete. In v1 of the
  mem: vocabulary this is recommended but not shape-enforced.
- **Announcement POST fails:** Log and continue. Substrate state is correct (new version
  is live, prior version in Memento); the `.operations/` log entry is missing.

## References

- Affordance descriptor: `/vault/meta/affordances/supersede`
- Action class: `/vault/ontology/mem#SupersedeAction`
- Memento support: D61–D68, K1; RFC 7089
- L3 reference profile entry point: `/vault/wiki/index.md`
