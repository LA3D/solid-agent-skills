---
name: inbox-subscribe
description: "Subscribe an agent to a wiki-memory event stream or operations log via Solid Notifications WebhookChannel2023. The subscriber inbox is the user WebID profile's ldp:inbox (per HR-2: multiple agents share one inbox per user, PROV-O tags which agent). Use when starting to work with a new wiki-memory or when refreshing subscriptions."
---

# inbox-subscribe

## When to use

First contact with a new wiki-memory Pod where the agent needs to receive notifications, or
to add a new topic subscription (e.g., subscribing to `/vault/wiki/.events/` after only
previously subscribing to `/vault/wiki/.operations/`). Trigger phrases: "subscribe to wiki
events", "set up notifications", "start watching the substrate", "register for operation
updates", "subscribe to the inbox", "add a notification subscription".

Do NOT use for:
- Listing existing inbox contents (use inbox-list)
- Reading a specific notification entry (use inbox-read)
- When the agent only needs to poll episodically rather than receive push notifications

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

Call the discovered inbox URL `<subscriber-inbox>` below.

## Procedure

1. **Determine the topic to subscribe to.** Common topics:
   - `<pod>/vault/wiki/.operations/` — agent-emitted action announcements (`as:Announce` multi-typed with `mem:*Action`)
   - `<pod>/vault/wiki/.events/` — substrate-emitted analysis events (`mem:Event` subclasses)
   - `<pod>/vault/wiki/` — per-resource CRUD events on wiki-memory content

2. **Compose the subscription request body.** Create a temporary file (e.g., `subscription-body.json`):

   ```jsonld
   {
     "@context": "https://www.w3.org/ns/solid/notifications/v1",
     "type": "WebhookChannel2023",
     "topic": "<topic-url>",
     "sendTo": "<subscriber-inbox>"
   }
   ```

   Replace `<topic-url>` with the container URL from step 1 and `<subscriber-inbox>` with
   the inbox URL discovered from the WebID profile.

3. **POST the subscription request to the notifications endpoint:**

   ```bash
   solid-pod create <pod>/.notifications/WebhookChannel2023/ \
     --body subscription-body.json \
     --content-type application/ld+json
   ```

   If the CLI does not support a `--content-type` flag for JSON-LD, use curl as a fallback:

   ```bash
   curl -X POST \
     -H "Content-Type: application/ld+json" \
     -d @subscription-body.json \
     https://<pod>/.notifications/WebhookChannel2023/
   ```

4. **Capture the channel object from the response.** The Pod responds with a JSON-LD object
   including an `id` field (the channel URL). Save this ID (e.g., in a scratch note or
   config snippet) so the subscription can be inspected or torn down later:

   ```
   Subscription created:
     channel id: <channel-id>
     topic:      <topic-url>
     sendTo:     <subscriber-inbox>
   ```

5. **Repeat for additional topics** if the agent needs notifications from both `.operations/`
   and `.events/`. Each topic requires a separate subscription POST.

6. **Verify** by checking that the subscriber inbox (found in step Discovery) exists and is
   accessible:

   ```bash
   solid-pod read <subscriber-inbox> --accept text/turtle
   ```

   A 200 response with an `ldp:Container` type confirms the inbox is ready to receive
   notifications.

## Failure handling

- **401/403 on POST**: The agent is not authenticated to the wiki-memory Pod. Check that
  Solid-OIDC + DPoP credentials are configured. See D85 for the TLS cert setup that
  must precede auth.
- **404 on `/.notifications/WebhookChannel2023/`**: The WebhookChannel2023 endpoint is not
  enabled on this Pod. Verify the CSS config includes WebhookChannel2023 support (should be
  enabled by default in `dev-allow-all.json` or the equivalent prod config).
- **WebID has no `ldp:inbox`**: Surface the remediation message from the Discovery section
  above. Do NOT proceed — this skill cannot route notifications without a known inbox URL.
- **Topic URL returns 404**: The wiki-memory L3 substrate may not be deployed or the
  container hasn't been initialized. Verify `<pod>/vault/wiki/.operations/` and
  `<pod>/vault/wiki/.events/` exist by checking the wiki-memory overlay has been applied
  (`apply.py` for the wiki-memory overlay).

## References

- Solid Notifications Protocol: <https://solidproject.org/TR/notifications-protocol>
- WebhookChannel2023 spec: <https://solid.github.io/notifications/webhook-channel-2023>
- HR-2 design: subscriber inbox is the WebID profile's `ldp:inbox`; agent identity via
  `prov:wasAssociatedWith` (cogitarelink-solid Memory Structuring Sprint)
- Operations log: `<pod>/vault/wiki/.operations/`
- Events stream: `<pod>/vault/wiki/.events/`
- Owner-identity overlay (provisions `ldp:inbox`): `cogitarelink-solid/overlays/owner-identity/`
- Decision: D89 (owner-identity overlay), D90 (preferences + inbox provisioning)
