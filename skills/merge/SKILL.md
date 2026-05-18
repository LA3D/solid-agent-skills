---
name: merge
description: Combine multiple wiki-memory resources into one canonical entry. Use when the user says 'merge X and Y', 'combine these duplicates', 'consolidate X with Y', or when multiple durable resources should become a single entry. Preserves provenance via prov:wasDerivedFrom for each input and deletes inputs after the merged resource is durable. All inputs must be the same rdf:type class.
---

# merge

## When to use

When duplicate or substantially overlapping durable resources should become one canonical
entry. Trigger phrases: "merge X and Y", "combine these duplicates", "consolidate X with Y",
"these two are the same thing".

Use merge when:
- Two or more durable resources are duplicates or closely related fragments
- A single canonical URL is preferable to multiple overlapping resources
- Provenance back to the inputs must be preserved (`prov:wasDerivedFrom`)

Do NOT use for:
- Cross-class merges (e.g., merging a `wiki:Concept` with a `wiki:Source`): first convert
  one via supersede, then merge. The merged resource inherits the class of the inputs.
- Merging a working note with a durable note: crystallize the working note first.

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/merge --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **Fetch each input resource** body and `.meta`:
   ```bash
   solid-pod read <input-1-url>
   solid-pod read <input-1-url>.meta --accept text/turtle
   solid-pod read <input-2-url>
   solid-pod read <input-2-url>.meta --accept text/turtle
   # repeat for all inputs
   ```
   Verify all inputs share the same `rdf:type`. If they differ, abort with a clear error
   explaining which classes conflict.

2. **Choose the merged target URL.** Prefer the URL of the most canonical input (the
   "primary" entry) if there's a clear choice, or compose a new slug from the merged
   content's combined `dct:title`.

3. **Compose the merged body and `.meta`:**
   - Combine body content from all inputs (agent judgment call on ordering/structure).
   - Merge `.meta` predicates: union all non-provenance triples, taking the earliest
     `dct:created` and the latest `dct:modified`.
   - Add merge provenance:
     ```turtle
     @prefix prov: <http://www.w3.org/ns/prov#> .
     @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
     @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

     <merged-url> prov:wasGeneratedBy [
         a mem:MergeAction, prov:Activity ;
         prov:wasAssociatedWith <agent-webid> ;
         prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
     ] .
     <merged-url> prov:wasDerivedFrom <input-1-url>, <input-2-url> .
     ```
     List all input URLs in `prov:wasDerivedFrom`.

4. **PUT the merged resource:**
   ```bash
   solid-pod create <merged-url> --body <body-file> --meta <meta-file>
   ```
   On HTTP 422 with `sh:ValidationReport`: surface the report and abort. No inputs
   have been deleted.

5. **On 201 success, DELETE each input:**
   ```bash
   solid-pod delete <input-1-url>
   solid-pod delete <input-2-url>
   # repeat for all inputs
   ```
   If any DELETE fails, continue deleting the remaining inputs and note the failures
   in the announcement.

6. **POST the MergeAction announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:MergeAction ;
       as:actor   <agent-webid> ;
       as:object  <input-1-url>, <input-2-url> ;
       as:result  <merged-url> ;
       as:target  <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   If some DELETEs failed, include a `schema:description` triple on the announcement
   noting which inputs remain.
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **SHACL rejection on merged PUT (422):** Surface the `sh:ValidationReport` to the user
  and abort. No inputs are deleted — all originals remain intact.
- **DELETE fails partway through:** Continue deleting remaining inputs. Record which URLs
  were not deleted in the announcement (step 6). The merged resource IS the canonical
  copy; residual inputs are orphaned duplicates for human cleanup.
- **Announcement POST fails:** Log and continue. Substrate state is correct.

## References

- Affordance descriptor: `/vault/meta/affordances/merge`
- Action class: `/vault/ontology/mem#MergeAction`
- L3 reference profile entry point: `/vault/wiki/index.md`
