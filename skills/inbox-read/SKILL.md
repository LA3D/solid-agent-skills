---
name: inbox-read
description: Read one specific inbox entry by URL and parse its activity body — actor, object, target, type, payload — returning a structured representation for agent reasoning. Pair with inbox-list to enumerate then drill in. Use when the user provides a specific notification URL or when inbox-list surfaces an entry the agent wants to act on.
---

# inbox-read

## When to use

When the agent has a specific inbox entry URL and needs to understand it in full detail.
Trigger phrases: "read this notification", "what does this entry say?", "parse this
activity", "tell me more about this event", "what triggered this?", "drill into that
entry". Also fires automatically when inbox-list surfaces an entry flagged as
high-priority (e.g., `mem:BoundExceeded`, `mem:UnprocessableWrite`) and the agent
needs the full payload before deciding how to respond.

Do NOT use for:
- Listing all entries in a container (use inbox-list)
- Setting up subscriptions (use inbox-subscribe)
- When the entry URL is unknown — use inbox-list first to discover URLs

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

## Procedure

1. **Fetch the entry:**
   ```bash
   solid-pod read <entry-url> --accept text/turtle
   ```

2. **Parse the Turtle response.** Extract the following fields:

   **Core activity fields (from Activity Streams 2.0 + PROV-O):**
   | Field | Predicate | Notes |
   |-------|-----------|-------|
   | `type` | `rdf:type` | Multi-valued; see type table below |
   | `actor` | `as:actor` | Agent or user that triggered this activity |
   | `runtime` | `prov:wasAssociatedWith` | Software that ran it (agent identity per HR-2) |
   | `object` | `as:object` | The affected resource URL |
   | `target` | `as:target` | Container where the entry was posted |
   | `published` | `as:published` | xsd:dateTime timestamp |
   | `summary` | `as:summary` | Human-readable summary if present |

   **Type-specific payload fields:**

   | Entry type | Extra predicates to extract |
   |-----------|----------------------------|
   | `mem:BoundExceeded` | `mem:childCount` (integer), `mem:threshold` (integer) |
   | `mem:UnprocessableWrite` | `as:context` → the `sh:ValidationReport` blank node; extract `sh:resultMessage` and `sh:focusNode` from it |
   | `mem:CrystallizeAction` (as:Announce) | `prov:wasDerivedFrom` → the source working note URL |
   | `mem:SupersedeAction` (as:Announce) | `as:object` → the durable resource; check `prov:wasRevisionOf` on the durable resource if you need the prior version |
   | `mem:DemoteAction` (as:Announce) | `as:object` → the demoted resource |
   | `mem:MergeAction` (as:Announce) | `as:object` → the surviving resource; `as:origin` or `prov:wasDerivedFrom` → the merged-away resource |
   | `mem:LinkAction` (as:Announce) | `as:object` → the source resource; `as:target` → the linked resource |

3. **Categorize the entry** by its `rdf:type` combination:

   | Type combination | Meaning |
   |-----------------|---------|
   | `[as:Announce, mem:CrystallizeAction]` | Agent completed a Crystallize — a working note promoted to durable |
   | `[as:Announce, mem:SupersedeAction]` | Agent replaced a durable resource with a new version |
   | `[as:Announce, mem:DemoteAction]` | Agent demoted a durable resource back to working |
   | `[as:Announce, mem:MergeAction]` | Agent merged two resources |
   | `[as:Announce, mem:LinkAction]` | Agent added a typed link between resources |
   | `[as:Activity, mem:BoundExceeded]` | Substrate detected a container exceeded the Fano bound (12 children) |
   | `[as:Activity, mem:UnprocessableWrite]` | Substrate rejected a write — surface the sh:ValidationReport to the user |

   If the type combination doesn't match any row above, report the raw `rdf:type` values
   and continue — the vocabulary may have been extended since this skill was written.
   Dereference `<pod>/vault/ontology/mem` to look up the class definition.

4. **Return a structured summary** for agent reasoning:

   ```
   Entry:     <entry-url>
   Type:      <short type name(s)>
   Published: <ISO-8601 timestamp>
   Actor:     <actor IRI or "substrate">
   Runtime:   <prov:wasAssociatedWith IRI>
   Object:    <as:object IRI>
   Target:    <as:target IRI>

   Payload:
     <type-specific fields from the table above>
   ```

   Example output for a `mem:BoundExceeded` event:
   ```
   Entry:     https://pod.vardeman.me/vault/wiki/.events/20260518T142001Z-abc123.ttl
   Type:      BoundExceeded
   Published: 2026-05-18T14:20:01Z
   Actor:     substrate
   Runtime:   <urn:css:MemTriggerListener>
   Object:    https://pod.vardeman.me/vault/wiki/pages/
   Target:    https://pod.vardeman.me/vault/wiki/.events/

   Payload:
     childCount: 13
     threshold:  12
   ```

   Example output for a `mem:UnprocessableWrite` event:
   ```
   Entry:     https://pod.vardeman.me/vault/wiki/.events/20260518T153302Z-def456.ttl
   Type:      UnprocessableWrite
   Published: 2026-05-18T15:33:02Z
   Actor:     substrate
   Object:    https://pod.vardeman.me/vault/wiki/concepts/foo.md

   Payload:
     sh:focusNode: https://pod.vardeman.me/vault/wiki/concepts/foo.md
     sh:resultMessage: "Value of dct:title is not a string literal"
   ```

5. **If the entry warrants action**, surface the recommendation:
   - `mem:BoundExceeded`: Suggest running the demote skill to move lower-priority entries
     back to working memory, or splitting the container.
   - `mem:UnprocessableWrite`: Surface the `sh:resultMessage` and the resource URL.
     Suggest editing the resource body or `.meta` to fix the SHACL violation.
   - `mem:CrystallizeAction`: Acknowledge the completed promotion; no action needed unless
     the user wants to inspect the new durable resource.

## Failure handling

- **404 on entry URL**: The entry was deleted (not tombstoned — just gone). Report to the
  user and suggest using inbox-list to re-enumerate.
- **410 Gone**: The entry was tombstoned by the substrate (D64 archive action). The resource
  existed but has been formally archived. The tombstone body may carry a `mem:tombstoneOf`
  triple pointing at the canonical archive URL.
- **Parse error (malformed Turtle)**: Report the raw response and the parse error. Do not
  attempt to reason about the entry — skip it and note the URL in the output.
- **Unknown `rdf:type`**: Report the raw type IRIs. Dereference `<pod>/vault/ontology/mem`
  to look up the class definition. If the class isn't in the vocabulary, note that the
  vocabulary may have been extended.

## References

- Event/Action class definitions: `<pod>/vault/ontology/mem` (each class carries
  `rdfs:comment`, `skos:scopeNote`, `skos:example` for FAIR signal)
- Affordance descriptors: `<pod>/vault/meta/affordances/` (for action types, the
  procedure descriptor that produced the activity)
- L3 synthesis entry point: `<pod>/vault/wiki/index.md`
- Activity Streams 2.0: <https://www.w3.org/TR/activitystreams-core/>
- PROV-O: <https://www.w3.org/TR/prov-o/>
- Decision: D73 (two-stage commit), D74 (mem:* AS2 vocab on LDN inbox + Solid Notifications)
- Tombstone semantics: D61–D68, K1
