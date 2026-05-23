# Search: "progressive disclosure"

**Total matches**: 1

## Discovery path (cold)

1. `GET /vault/` — `Link: rel="http://www.w3.org/ns/solid/terms#storageDescription"` pointed at `/vault/.well-known/solid`.
2. `GET /vault/.well-known/solid` — declared `wiki:affordanceCatalog </meta/affordances/>`.
3. `GET /vault/meta/affordances/` — enumerated affordances; `wiki-search-grep.ttl` matched the task.
4. `GET /vault/meta/affordances/wiki-search-grep.ttl` — `sh:agentInstruction` specified the wire form:
   `GET /vault/wiki/?ext=search-grep&oslc.searchTerms=%22<phrase>%22` (OSLC Query 3.0 §7.3, comma-separated double-quoted phrases, URL-encoded).
5. Issued the search; response is `oslc:ResponseInfo` with `oslc:totalCount` and `ldp:contains` plus per-match `oslc:score`, `vault:matchedLine`, `vault:matchedContext`.

## Matches

### 1. `https://pod.vardeman.me/vault/wiki/concepts/progressive-disclosure.md`

- `oslc:score`: 80
- `vault:matchedLine`: 8
- Snippet (from `vault:matchedContext`, verified by direct GET of the page body):

  > # Progressive Disclosure
  >
  > Progressive disclosure is the retrieval pattern of starting from a high-level index and descending only into nodes that the current task requires. It contrasts with flat-RAG, which retrieves a fixed-size context window over the entire corpus regardless of structure.

## Notes

- The phrase appears multiple times within the single matching page (heading + first body sentence + a later sentence referencing the Fano bound). The affordance returns one row per resource, not per occurrence — score `80` reflects density within that page.
- The Pod's `wiki-search-grep` affordance is the canonical surface for literal-substring queries over wiki-memory bodies. WAC is enforced server-side and unreadable matches are omitted (not denied); for this anonymous query no such omission was indicated.
