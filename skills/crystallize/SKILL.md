---
name: crystallize
description: Promote a working note to durable storage in wiki-memory L3 by performing a Crystallize action — the agent fetches the working note, looks up its destination class container via Type Index, PUTs to the destination, DELETEs the source, and POSTs an as:Announce activity to /vault/wiki/.operations/. Use when the user says 'crystallize this', 'promote this to durable', or when a working note is mature enough to commit. The substrate validates against the destination class's SHACL shape at PUT time.
---

# crystallize

## When to use

When a working note is mature enough to commit to durable storage. Trigger phrases:
"crystallize this", "promote to durable", "make this permanent", "commit this to wiki".

Do NOT use for:
- In-place edits to already-durable resources (use supersede)
- Notes that don't yet have an `rdf:type` matching a wiki-memory L3 class (`wiki:Concept`, `wiki:Source`, `wiki:Person`, `wiki:Procedure`, `wiki:Page`) — the Type Index needs the class to route the destination

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/crystallize --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **Fetch the source working note:**
   ```bash
   solid-pod read <pod>/vault/wiki/working/<slug>.md
   ```
   This returns the body content and the `.meta` sidecar (inspect via the `describedby` Link header).

2. **Extract the source's `rdf:type` from its `.meta`:**
   ```bash
   solid-pod read <pod>/vault/wiki/working/<slug>.md.meta --accept text/turtle
   ```
   Parse the Turtle, find the `rdf:type` triple on the resource. This is the destination class.

3. **Look up the destination container via the Type Index:**
   ```bash
   solid-pod read <pod>/vault/settings/publicTypeIndex --accept text/turtle
   ```
   Find the `solid:instanceContainer` for the source class. The destination URL is
   `<container><slug>.md`.

4. **Compose the destination body and `.meta`.** The `.meta` must include:
   - All predicates from the source `.meta` (title, creator, dates, etc.)
   - A PROV-O activity recording this Crystallize action:
     ```turtle
     @prefix prov: <http://www.w3.org/ns/prov#> .
     @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
     @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

     <destination-url> prov:wasGeneratedBy [
         a mem:CrystallizeAction, prov:Activity ;
         prov:wasAssociatedWith <agent-webid> ;
         prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
     ] .
     <destination-url> prov:wasDerivedFrom <source-url> .
     ```

5. **PUT the destination:**
   ```bash
   solid-pod create <destination-url> --body <body-file> --meta <meta-file>
   ```
   On HTTP 422 with `sh:ValidationReport`: surface the validation report to the user;
   do NOT proceed to step 6. The source is untouched.

6. **On 201 success, DELETE the source:**
   ```bash
   solid-pod delete <source-url>
   ```

7. **POST the Crystallize announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:CrystallizeAction ;
       as:actor  <agent-webid> ;
       as:object <destination-url> ;
       as:target <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **SHACL rejection on destination PUT (422):** Surface the `sh:ValidationReport` prose to the user;
  suggest fixes based on `sh:resultMessage` entries. The source is NOT deleted — the working
  note is intact and can be edited and retried.
- **DELETE source fails after destination PUT succeeded:** Report partial state — the substrate
  now has both copies. The destination IS durable. Emit the announcement anyway, then advise
  the user to manually delete the source URL.
- **Announcement POST fails:** Log the failure and continue. Substrate state is correct (destination
  durable, source gone) — the `.operations/` log is just missing one entry.

## References

- Affordance descriptor: `/vault/meta/affordances/crystallize`
- Action class: `/vault/ontology/mem#CrystallizeAction`
- L3 reference profile entry point: `/vault/wiki/index.md`
- Decision: D73 (two-stage commit), D91 (wiki-search affordance model reference)
