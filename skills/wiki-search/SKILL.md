---
name: wiki-search
description: Recursive literal-substring AND-search over wiki-memory L3 markdown pages on a Solid Pod. Returns ranked matches with snippets, paginated per OSLC Query 3.0. Use for literal-witness queries (exact phrases, citation keys, named entities). For paraphrase/synthesis queries, escalate to wiki-meta-query (SPARQL over .meta).
---

# wiki-search

## When to use

Literal-witness search over wiki-memory pages. Best for:
- Exact phrases ("progressive disclosure", "ESPRESSO PG4")
- Named entities (people, projects, citation keys like `@sen-2026-grep-harnesses`)
- Code identifiers, URLs, dates
- Multi-term boolean intersection (AND across all terms — every term must appear)

NOT good for paraphrase or synthesis. If grep returns nothing or low-confidence
matches, escalate to wiki-meta-query.

## Pre-flight — TLS dev cert

If running against a Pod with a mkcert dev cert (D85): ensure `NODE_EXTRA_CA_CERTS` is set to
the mkcert root CA: `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`. The CLI
auto-detects mkcert at startup and registers the CA via undici, so this is usually a
silent no-op in dev. NEVER set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Invocation

```bash
solid-pod wiki-search <container-url> "phrase 1" ["phrase 2" …] [--page-size N] [--start-index N]
```

Example:
```bash
solid-pod wiki-search https://pod.vardeman.me/vault/wiki/ "progressive disclosure" "ESPRESSO"
```

## Response shape

JSON object:
- `totalCount` — full WAC-filtered AND-filtered match count
- `nextPage` — URL of the next page, or `null` on the final page
- `pageSize` — count of results in the current response
- `results` — `[{url, score, line, context}]` sorted by descending score

Score is 0–100, density-based (v1; tuned against Rung 1.5 eval evidence).
`line` is 1-indexed; `context` is a halo-bounded snippet around the first match.

## WAC semantics

The Pod enforces WAC server-side: matches the requester cannot read are
**omitted, not denied**. If a subcontainer is denied, its entire subtree is
absent from the results — agents cannot infer the existence of denied
subcontainers from response shape.

## Limitations (Phase 7a)

- Single Pod only. Federation is Round 4.
- Score formula is v1 — RQ-Search-1 tunes during Rung 1.5 eval.
- `oslc.where` / `oslc.select` / `oslc.orderBy` / `oslc.prefix` return 501.
- No transactional consistency across paginated requests if the Pod is
  being written to mid-query.

## Cross-references

- Affordance descriptor: `/vault/meta/affordances/wiki-search-grep.ttl`
- Capability descriptor: `/vault/meta/capabilities/wiki-search-substrate.ttl`
- Pod-side design: `cogitarelink-solid/docs/plans/2026-05-17-wiki-search-design.md` + refinement
- Decision: D87
