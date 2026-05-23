---
name: wiki-search
description: Literal-substring AND-search over wiki-memory L3 pages on a Solid Pod. Use for literal-witness queries (exact phrases, citation keys, named entities, code identifiers). For paraphrase/synthesis queries, escalate to SPARQL over .meta via Comunica. AND across all terms; matches the requester cannot read are omitted, not denied.
---

# wiki-search

## When to use

- Exact phrases, citation keys (`@author-year-paper`), named entities, code identifiers, URLs, dates
- Multi-term boolean intersection (AND across all terms — every term must appear in a page)
- If grep returns nothing or low confidence, escalate to a SPARQL-over-.meta query instead

## Tool

```bash
solid-pod wiki-search <container-url> "phrase 1" ["phrase 2" ...]
```

The CLI handles OSLC §7.3 quoting + URL encoding + paging. If `which solid-pod` returns nothing, this repo's CLI isn't installed — run `npm link` from the repo root (see README).

## Where the canonical spec lives

The wire form, response schema, score formula, and WAC semantics are published by the Pod itself at:

```
GET <pod>/meta/affordances/wiki-search-grep.ttl
```

Look for `sh:agentInstruction` for the canonical invocation. If the CLI is unavailable or you need to learn the wire form for any reason, fetch that descriptor — it is the source of truth, not this skill.

## Two things this skill says that the substrate doesn't

- **Pre-flight (TLS dev cert)**: if running against a Pod with a mkcert dev cert, the CLI auto-registers the CA via undici (silent no-op in dev). Never set `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- **Routing hint**: this affordance is for literal-witness retrieval. If your query is paraphrase or synthesis, the affordance descriptor will not save you — you need a different surface (SPARQL over .meta).
