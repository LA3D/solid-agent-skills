# Wiki Pages Mentioning "karpathy" (case-insensitive)

**Total matches: 6**

## Discovery method

1. `GET /vault/` Link headers exposed `rel="http://www.w3.org/ns/solid/terms#storageDescription"` → `/vault/.well-known/solid`.
2. Storage description declared an affordance catalog at `/vault/meta/affordances/`.
3. `wiki-search-grep.ttl` advertised an OSLC Query 3.0 search affordance: `GET /vault/wiki/?ext=search-grep&oslc.searchTerms="<phrase>"`.
4. Issued one paged request (pageSize=100) with term `"karpathy"`. Response is Turtle with `oslc:totalCount 6` and no `oslc:nextPage` — single page covers all matches.

## Matches

### 1. `https://pod.vardeman.me/vault/wiki/concepts/agentic-engineering.md`
- Score 27, line 21
- "…patterns - Cost accounting and budget discipline The term is associated with [[karpathy-andrej]]{.author}, whose Sequoia Ascent 2026 talk framed \"Software 3.0\" as the…"

### 2. `https://pod.vardeman.me/vault/wiki/concepts/wiki-memory.md`
- Score 27, line 14
- "…Parent category: [[agentic-memory]]{.broader}. The pattern originated with [[karpathy-andrej]]{.author} as a personal knowledge approach for LLMs. The architectural…"

### 3. `https://pod.vardeman.me/vault/wiki/people/ghumare-andre.md`
- Score 27, line 10
- "…draft --- # Andre Ghumare Author of LLM Wiki v2, the most direct extension of Karpathy's wiki-memory design. Extends [[wiki-memory]]{.related} with explicit typed edg…"

### 4. `https://pod.vardeman.me/vault/wiki/concepts/compounding-knowledge.md`
- Score 26, line 16
- "…ets bigger but not richer. Knowledge does not compound — it merely accretes. [[karpathy-andrej]]{.author} named this distinction explicitly: \"knowledge compounds over…"

### 5. `https://pod.vardeman.me/vault/wiki/people/karpathy-andrej.md`
- Score 26, line 8
- "…26-05-23T00:00:00Z modified: 2026-05-23T00:00:00Z maturity: draft --- # Andrej Karpathy Researcher and educator. Foundational thinker for both [[wiki-memory]]{.relate…"

### 6. `https://pod.vardeman.me/vault/wiki/procedures/how-to-ingest-source.md`
- Score 25, line 10
- "…ocedure for processing a new source into the wiki-memory corpus. Implements the Karpathy \"Ingest\" operation with the fan-out discipline that drives [[compounding-knowle…"
