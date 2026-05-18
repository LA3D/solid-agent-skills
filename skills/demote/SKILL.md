---
name: demote
description: Move a durable wiki-memory resource back to working memory for reconsideration. Use when the user says 'demote X', 'move X back to working', 'un-crystallize X', or when a durable concept needs significant rework that won't conform to its current class shape mid-edit. The prior durable version is preserved by Memento; the working note inherits a permissive shape so rework can iterate freely before re-crystallization.
---

# demote

## When to use

When a durable resource needs substantive rework that would fail its class's SHACL shape
mid-edit. Trigger phrases: "demote X", "move X back to working", "un-crystallize X",
"I need to rework X from scratch".

Use demote when:
- The rework is large enough that the intermediate state would fail SHACL validation
- You want a safe working-memory scratchpad before re-crystallizing
- The prior durable version should be kept in Memento (time-travel access preserved)

Do NOT use for:
- Small corrections to a durable resource: use supersede (or a plain PATCH if minor)
- Permanently retiring a resource: use archive

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery

Before invoking, fetch the affordance descriptor for full pre/post-conditions and any
substrate updates since this skill was written:

```bash
solid-pod read <pod>/vault/meta/affordances/demote --accept text/turtle
```

The descriptor is the substrate's source of truth; this skill is a convenience wrapper.

## Procedure

1. **Fetch the durable resource:**
   ```bash
   solid-pod read <durable-url>
   solid-pod read <durable-url>.meta --accept text/turtle
   ```
   Capture the body content, the `.meta` triples, and the response Link headers
   from the initial GET.

2. **Discover the prior-version Memento URI** from the Link headers
   (`rel="timegate"` or `rel="memento"`). This becomes `prov:wasDerivedFrom` on
   the working note — preserving the link back to the last durable version.

3. **Compose the working-note body and `.meta`.**
   - Body: same markdown as the durable source (rework happens after demote).
   - `.meta`: preserve the `rdf:type` (important — crystallize needs it to route back
     to the correct durable container) and `dct:title`; add demote provenance:
     ```turtle
     @prefix prov: <http://www.w3.org/ns/prov#> .
     @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
     @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

     <working-url> prov:wasGeneratedBy [
         a mem:DemoteAction, prov:Activity ;
         prov:wasAssociatedWith <agent-webid> ;
         prov:atTime "<ISO-8601 timestamp>"^^xsd:dateTime
     ] .
     <working-url> prov:wasDerivedFrom <prior-memento-uri> .
     ```
     Use the same slug: working URL is `<pod>/vault/wiki/working/<slug>.md`.

4. **PUT to the working container:**
   ```bash
   solid-pod create <pod>/vault/wiki/working/<slug>.md --body <body-file> --meta <meta-file>
   ```
   The working-memory shape is permissive (only `dct:title` required), so this
   should not fail validation. On unexpected 422, surface the report and abort.

5. **On 201 success, DELETE the durable resource:**
   ```bash
   solid-pod delete <durable-url>
   ```

6. **POST the DemoteAction announcement to `/vault/wiki/.operations/`:**
   ```turtle
   @prefix as:   <https://www.w3.org/ns/activitystreams#> .
   @prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
   @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

   <urn:uuid:{generated-uuid}> a as:Announce, mem:DemoteAction ;
       as:actor  <agent-webid> ;
       as:object <working-url> ;
       as:target <pod>/vault/wiki/.operations/ ;
       as:published "<ISO-8601 timestamp>"^^xsd:dateTime .
   ```
   ```bash
   solid-pod create <pod>/vault/wiki/.operations/<timestamp>-<uuid>.ttl --body <announcement-file>
   ```

## Failure handling

- **PUT to working fails (unexpected 422):** Surface the `sh:ValidationReport` and abort.
  Durable resource is untouched.
- **DELETE durable fails after working PUT succeeded:** Report partial state — both copies
  exist. The working note is the active scratchpad; the durable copy is an orphaned duplicate.
  Advise the user to manually delete `<durable-url>` before re-crystallizing (to avoid
  SHACL conflicts if the slug collides on the return path).
- **Announcement POST fails:** Log and continue. Substrate state is correct.

## References

- Affordance descriptor: `/vault/meta/affordances/demote`
- Action class: `/vault/ontology/mem#DemoteAction`
- Memento support: D61–D68, K1; RFC 7089
- Two-stage commit: D73 (crystallize is the inverse of demote)
- L3 reference profile entry point: `/vault/wiki/index.md`
