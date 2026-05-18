---
name: inbox-list
description: List the contents of an LDN inbox or substrate notification container — wiki-memory's operation log, the substrate event stream, or the agent's own subscriber inbox. Returns entries sorted by published timestamp, optionally filtered by rdf:type (e.g., mem:Event subclasses). Use when the user asks 'what's new in wiki-memory?' or 'what has the substrate flagged?'
---

# inbox-list

## When to use

At session start to catch up on activity across sessions; after a long gap away from a
wiki-memory Pod; to triage what the substrate has flagged for attention; or to review
the operations history. Trigger phrases: "what's new in wiki-memory?", "what has the
substrate flagged?", "show me the operations log", "list recent events", "what happened
since I was last here?", "catch me up on the inbox", "show substrate events".

Do NOT use for:
- Reading the full body of a specific entry (use inbox-read)
- Setting up notifications in the first place (use inbox-subscribe)

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Discovery — the user's inbox

Per HR-2 design, the agent's subscriber inbox is the user WebID profile's `ldp:inbox`.
Multiple agents share one inbox per user; PROV-O on each activity carries the agent identity
(`prov:wasAssociatedWith <urn:agent:claude-code>` or similar). Fetch the user's WebID first:

```bash
solid-pod read <user-webid> --accept text/turtle
```

Look for the `ldp:inbox` triple. If absent, report to the user: "Your WebID profile at
<webid> doesn't declare an ldp:inbox. Add the triple `<> ldp:inbox <inbox-url>` to your
profile, or run setup-owner if the owner-identity overlay hasn't been applied. This skill
cannot proceed without an inbox URL."

## Common containers

| Container | Purpose |
|-----------|---------|
| `<pod>/vault/wiki/.operations/` | Agent-emitted action announcements (`as:Announce` multi-typed with `mem:*Action`) |
| `<pod>/vault/wiki/.events/` | Substrate-emitted analysis events (`mem:Event` subclasses; mostly stubbed in v1) |
| `<own-pod>/inbox/` (or the URL declared in the WebID profile) | Subscriber inbox after subscribing via inbox-subscribe |

## Procedure

1. **Determine the container to enumerate.** Default choices by intent:
   - Operations history → `<pod>/vault/wiki/.operations/`
   - Substrate flags/events → `<pod>/vault/wiki/.events/`
   - Inbound notifications (after subscribing) → the `ldp:inbox` URL from Discovery above

2. **Fetch the container listing:**
   ```bash
   solid-pod read <container-url> --accept text/turtle
   ```
   Parse the response for `ldp:contains` triples. Each object is a child entry URL.

3. **For each entry URL, fetch and parse:**
   ```bash
   solid-pod read <entry-url> --accept text/turtle
   ```
   Extract the following fields per entry:
   - `rdf:type` (multi-valued) — used for filtering and display categorization
   - `as:published` — timestamp (xsd:dateTime); use for sorting
   - `as:actor` — agent or user that triggered this entry
   - `prov:wasAssociatedWith` — software runtime (agent identity per HR-2)
   - `as:object` — the affected resource URL
   - `as:summary` — human-readable summary if present

4. **Sort** all entries by `as:published` descending (most recent first).

5. **Optionally filter by type.** Common filter patterns:
   - All `mem:Event` subclasses: `rdf:type` array contains an IRI under
     `https://pod.vardeman.me/vault/ontology/mem#` AND the class is a subclass of
     `mem:Event`. Dereference `<pod>/vault/ontology/mem` to get the full class
     hierarchy if needed.
   - All `mem:*Action` announcements: `rdf:type` array contains BOTH `as:Announce`
     AND a `mem:*Action` class (e.g., `mem:CrystallizeAction`, `mem:SupersedeAction`,
     `mem:DemoteAction`, `mem:MergeAction`, `mem:LinkAction`).
   - `mem:BoundExceeded` events only: `rdf:type` array contains `mem:BoundExceeded`.
   - `mem:UnprocessableWrite` events only: `rdf:type` array contains
     `mem:UnprocessableWrite`.

6. **Output one summary line per entry** (do not dump full Turtle bodies at this stage):
   ```
   <timestamp>  <type-shortname>  <actor>  <object>
   ```
   Example:
   ```
   2026-05-18T14:23:07Z  CrystallizeAction  <agent-webid>  /vault/wiki/pages/progressive-disclosure.md
   2026-05-18T14:20:01Z  BoundExceeded      substrate      /vault/wiki/pages/  (childCount=13, threshold=12)
   ```

   If the container is empty, report: "No entries in `<container-url>` yet."

   For entries with unknown or unexpected types, list them with their raw `rdf:type` IRIs
   so the agent can reason about them.

## Failure handling

- **401/403 on container fetch**: The agent is not authenticated to the Pod. Check Solid-OIDC
  + DPoP credentials and the D85 TLS dev cert setup.
- **404 on container**: The container doesn't exist. Verify the wiki-memory L3 overlay has
  been applied and the Pod is running (`docker compose up -d` in cogitarelink-solid).
- **Container exists but has many entries**: Fetching all entries may be slow. In v1 there is
  no server-side paging for `ldp:contains`. If the entry count exceeds ~50, warn the user and
  offer to filter by a type or date range before fetching each entry body.
- **Entry fetch fails (404 on child)**: The entry may have been deleted or tombstoned (D64).
  Skip the entry and note the gap in the output.

## References

- Event vocabulary: `<pod>/vault/ontology/mem` (dereference for the full taxonomy;
  each class carries `rdfs:comment`, `skos:scopeNote`, `skos:example`)
- L3 synthesis entry point: `<pod>/vault/wiki/index.md`
- Activity Streams 2.0: <https://www.w3.org/TR/activitystreams-core/>
- HR-2 design: subscriber inbox is the WebID profile's `ldp:inbox`
  (cogitarelink-solid Memory Structuring Sprint)
- Decision: D73 (two-stage commit, which produces CrystallizeAction announcements)
