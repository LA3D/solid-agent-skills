# Wiki pages mentioning "karpathy"

**Total matches: 6**

Discovered via Pod self-description: `/vault/.well-known/solid` advertises
`wiki:affordanceCatalog` at `/vault/meta/affordances/`. The
`wiki-search-grep.ttl` descriptor declares an OSLC Query 3.0 affordance at
`/vault/wiki/?ext=search-grep&oslc.searchTerms=...` that performs recursive
literal-substring search over markdown bodies.

Query used:

```
GET /vault/wiki/?ext=search-grep&oslc.searchTerms=%22karpathy%22&oslc.pageSize=100
```

`oslc:totalCount = 6` — full result set returned in a single page.

## Matches

1. **https://pod.vardeman.me/vault/wiki/concepts/agentic-engineering.md** (score 27, line 21)
   > …patterns - Cost accounting and budget discipline The term is associated with [[karpathy-andrej]]{.author}, whose Sequoia Ascent 2026 talk framed "Software 3.0" as the…

2. **https://pod.vardeman.me/vault/wiki/concepts/wiki-memory.md** (score 27, line 14)
   > …Parent category: [[agentic-memory]]{.broader}. The pattern originated with [[karpathy-andrej]]{.author} as a personal knowledge approach for LLMs. The architectural…

3. **https://pod.vardeman.me/vault/wiki/people/ghumare-andre.md** (score 27, line 10)
   > …draft --- # Andre Ghumare Author of LLM Wiki v2, the most direct extension of Karpathy's wiki-memory design. Extends [[wiki-memory]]{.related} with explicit typed edg…

4. **https://pod.vardeman.me/vault/wiki/concepts/compounding-knowledge.md** (score 26, line 16)
   > …ets bigger but not richer. Knowledge does not compound — it merely accretes. [[karpathy-andrej]]{.author} named this distinction explicitly: "knowledge compounds over…

5. **https://pod.vardeman.me/vault/wiki/people/karpathy-andrej.md** (score 26, line 8)
   > …26-05-23T00:00:00Z modified: 2026-05-23T00:00:00Z maturity: draft --- # Andrej Karpathy Researcher and educator. Foundational thinker for both [[wiki-memory]]{.relate…

6. **https://pod.vardeman.me/vault/wiki/procedures/how-to-ingest-source.md** (score 25, line 10)
   > …ocedure for processing a new source into the wiki-memory corpus. Implements the Karpathy "Ingest" operation with the fan-out discipline that drives [[compounding-knowle…

## Notes

- The affordance returns one snippet per matching page (the highest-scoring
  line). All six pages contain at least one case-insensitive occurrence of
  "karpathy" — the wikilink token `[[karpathy-andrej]]` counts as a body
  occurrence per the affordance's literal-substring semantics.
- Server-side WAC may have omitted resources the anonymous client cannot
  read; the descriptor states such matches are silently omitted, not denied.
  No 401/403 was returned, so the totalCount of 6 reflects the anonymous-
  readable corpus.
