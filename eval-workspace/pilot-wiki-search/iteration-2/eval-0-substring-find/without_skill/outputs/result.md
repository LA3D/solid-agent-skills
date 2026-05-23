# Wiki Pages Containing "progressive disclosure"

**Pod**: https://pod.vardeman.me/vault/
**Query phrase** (literal, quoted): `"progressive disclosure"`
**Total matches**: 1

## Discovery path

1. `GET /vault/` — root response advertises `Link: <.../.well-known/solid>; rel="...storageDescription"`.
2. `GET /vault/.well-known/solid` — storage description enumerates `wiki:affordanceCatalog </meta/affordances/>`.
3. `GET /vault/meta/affordances/` — LDP container lists `wiki-search-grep.ttl`.
4. `GET /vault/meta/affordances/wiki-search-grep.ttl` — affordance declares `wiki:dispatchPattern "?ext=search-grep"` on `wiki:targetContainer </vault/wiki/>`, with `sh:agentInstruction` documenting OSLC Query 3.0 wire form (`oslc.searchTerms=%22<phrase>%22`).
5. `GET /vault/wiki/?ext=search-grep&oslc.searchTerms=%22progressive%20disclosure%22&oslc.pageSize=100` — server returned an OSLC `ResponseInfo` Turtle document with `oslc:totalCount 1`.

## Matches

### 1. https://pod.vardeman.me/vault/wiki/concepts/progressive-disclosure.md

- `oslc:score`: 80
- `vault:matchedLine`: 8
- Snippet (from `vault:matchedContext`):

  > …ted: 2026-05-23T00:00:00Z modified: 2026-05-23T00:00:00Z maturity: draft --- # Progressive Disclosure Progressive disclosure is the retrieval pattern of starting from a high-level…

## Summary

1 match found:

- `https://pod.vardeman.me/vault/wiki/concepts/progressive-disclosure.md`
