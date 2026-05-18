---
name: archive
description: Soft-delete a durable wiki-memory resource via the tombstone pattern (D64). Use when the user says 'archive X', 'soft-delete X', 'mark X obsolete', 'retire X', or when a resource should be flagged inactive but kept for history and time-travel access. The body remains dereferenceable; the .meta gains an as:Tombstone triple so agents know the resource is archived. Hard delete is a separate, VC-gated operation not covered by this skill.
---

# archive

## When to use

When a resource should be marked inactive/obsolete but remain historically accessible.
Trigger phrases: "archive X", "soft-delete X", "mark X obsolete", "retire X",
"flag X as inactive".

Use archive when:
- The resource is superseded by something else but should remain for provenance
- Time-travel access (Memento) to the content should remain possible
- You want agents to know the resource is inactive without removing it

Do NOT use for:
- Hard delete (rare; VC-gated per D64): use a different, separately authorized operation
- Temporary demotions for rework: use demote

The tombstone triple (`a as:Tombstone`) is the signal: any agent fetching the resource
and inspecting its `.meta` will see the tombstone and treat the resource as inactive.

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/archive --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **PATCH the resource's `.meta` to insert the tombstone triple:**

   Compose an N3 Patch body file (e.g., `tombstone-patch.n3`):
   ```turtle
   @prefix solid: <http://www.w3.org/ns/solid/terms#> .
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix prov: <http://www.w3.org/ns/prov#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <> a solid:InsertDeletePatch ;
       solid:inserts {
           <durable-url> a as:Tombstone ;
               prov:wasGeneratedBy [
                   a mem:ArchiveAction, prov:Activity ;
                   prov:wasAssociatedWith <agent-webid> ;
                   prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
               ] .
       } .
   ```
   Apply it:
   ```bash
   solid-pod patch <durable-url>.meta --body tombstone-patch.n3
   ```

2. **POST the ArchiveAction announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:ArchiveAction ;
       as:actor  <agent-webid> ;
       as:object <durable-url> ;
       as:target <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **PATCH returns 404 (resource does not exist):** The target URL is wrong or the resource
  was already deleted. Abort with a clear error — do not attempt to create a tombstone
  for a missing resource.
- **PATCH returns 403 (no write permission):** The agent lacks WAC write access to the
  `.meta` file. Surface the error; resource state unchanged.
- **Announcement POST fails:** Log and continue. The tombstone IS in place — the `.meta`
  accurately reflects the archived status.

## References

- Affordance descriptor: `/vault/meta/affordances/archive`
- Action class: `/vault/ontology/mem#ArchiveAction`
- Tombstone semantics: D64 (soft-delete pattern)
- L3 reference profile entry point: `/vault/wiki/index.md`
