# Phase 2 Design: Agent CLI End-to-End

**Date**: 2026-04-05
**Status**: Approved
**Decisions referenced**: D1, D9, D10, D16, D17, D18, D28, D29, D33, D34

## Goal

CLI works end-to-end against the live reference pod (`pod.vardeman.me:3000/vault/`).
An agent can discover → browse → query → search → create a conformant resource.

## Success Criteria

All 11 commands build, pass tests, and produce correct JSON-LD output against the
live pod with 107 imported vault notes. An end-to-end integration test proves the
full workflow. An OpenProse agentic test verifies an agent can accomplish goals using
only CLI tools and pod self-description.

## Consumer

LLM agents — Claude Code skills first, RLM/dspy agents later.
All output is JSON-LD with shared `SOLID_CONTEXT`. No human-readable mode. No interactivity.

## Architecture

```
┌─────────────────────────────────┐
│  Skills (.claude/skills/)       │  Agent workflows (discover, browse, query, create)
│  Compose CLI commands           │
├─────────────────────────────────┤
│  CLI Commands (src/commands/)   │  11 commands, JSON-LD output
│  solid-pod <cmd> <args>         │
├─────────────────────────────────┤
│  Lib (src/lib/)                 │  HTTP, Comunica SPARQL, JSON-LD, context
│  .meta discovery, Link headers  │
└─────────────────────────────────┘
         │
         ▼  HTTP (LDP + SPARQL)
┌─────────────────────────────────┐
│  Reference Pod (CSS + Comunica) │
│  pod.vardeman.me:3000/vault/    │
└─────────────────────────────────┘
```

### Key Design Decisions

1. **All output is JSON-LD** with shared `SOLID_CONTEXT`. Agents parse output directly.
2. **`.meta` discovery is explicit** — `discoverMetaSources()` works around the Comunica
   link-traversal gap (doesn't follow `describedby` on non-RDF resources).
3. **Search has a fallback chain** — try OSLC Query params first, fall back to SPARQL
   `FILTER(REGEX(...))` over `.meta` triples. Interface is stable; backend improves
   when server-side index lands.
4. **No auth in Phase 2** — reference pod runs `allow-all` (dev mode).

## New Commands

### `solid-pod search <container-url> <terms>`

```bash
solid-pod search http://pod.vardeman.me:3000/vault/resources/concepts/ "recursive language"
```

- Tries `GET <container-url>?oslc.searchTerms=<terms>` first
- If pod returns error (no OSLC support), falls back to SPARQL:
  ```sparql
  SELECT ?s ?label ?match WHERE {
    ?s skos:prefLabel|rdfs:label|dct:title ?label .
    ?s ?p ?match .
    FILTER(REGEX(STR(?match), "recursive language", "i"))
  }
  ```
- Sources: container `.meta` files (auto-discovered)
- Options: `--source <url>` for explicit scope, `--no-fallback` to skip OSLC attempt
- Returns: array of `{resource, label, matchedPredicate, matchedValue}`

### `solid-pod properties <container-url>`

```bash
solid-pod properties http://pod.vardeman.me:3000/vault/resources/concepts/
```

- SPARQL over container `.meta` sources:
  ```sparql
  SELECT ?p (COUNT(?s) AS ?count) WHERE { ?s ?p ?o }
  GROUP BY ?p ORDER BY DESC(?count)
  ```
- Reports what vocabulary the pod actually uses in practice
- Options: `--source <url>` for explicit source
- Returns: array of `{predicate, count}` sorted by frequency

## Testing Strategy

### Unit Tests (Vitest, no network)

- `parseLinkHeaders()` — existing 5 tests
- JSON-LD compaction
- OSLC fallback logic (mock HTTP responses to verify fallback chain)
- N3 Patch formatting

### Integration Tests (live pod)

Gated by `SOLID_POD_URL` env var — skipped without a pod.

- `info` returns VoID+DCAT with `fabric:LDPBrowse` feature flag
- `read /vault/resources/concepts/` returns `ldp:contains` listing
- `shapes` finds shapes in `/vault/procedures/shapes/` with `sh:agentInstruction`
- `sparql` over concepts returns results with known predicates
- `search` finds a known concept by label text
- `create` + `read` round-trip: create resource, read back, verify
- `properties` returns predicate counts for known container

### End-to-End Workflow Test

Single test executing: discover → shapes → browse → query → search → create.
Each step's output feeds the next.

### Agentic Testing (OpenProse)

A `.prose` or `.md` program that evaluates agent behavior against the pod:

**Agent**: arrives at unknown pod URL, has access to CLI tools only.

**Test tasks** (structured, with expected outcomes):
- "Find all concept notes about knowledge graphs" (discovery + search)
- "Create a new concept note conforming to the concept-note shape" (shape-guided creation)
- "Find what links to concept X" (backlinks + navigation)

**Judge session**: evaluates whether agent followed `sh:agentInstruction`, produced
conformant output, and used the discovery path rather than hard-coded knowledge.

Pattern follows `gepa-rlm-reasoning/autoresearch.prose`:
- Agent definitions with system prompts
- Sessions as conversational turns
- Template variables for data injection
- Loop over test tasks
- Structured evaluation output

## Work Phases

### Phase 2a — Build & Fix
1. `npm install` + `npm run build` — fix compile errors
2. Run unit tests, fix failures
3. Test each command against live pod, fix issues
4. Write integration tests for existing 9 commands

### Phase 2b — New Commands
5. Implement `search` (OSLC-first + SPARQL fallback)
6. Implement `properties`
7. Unit + integration tests for both

### Phase 2c — End-to-End
8. Integration test: discover → shapes → browse → query → search → create
9. Update skills to reflect command changes

### Phase 2d — Agentic Testing (OpenProse)
10. Write OpenProse program as agent evaluator
11. Define structured test tasks with expected outcomes
12. Judge session for conformance evaluation

## Out of Scope

- Pod-side agents / maintenance services (cogitarelink-solid roadmap)
- OSLC Query server extension (CSS extension, cogitarelink-solid)
- Vector search / embeddings (server-side, QMD-style)
- Solid-OIDC authentication (Phase 3)
- Formal access pattern experiments (Phase 3)
- Demo recording / publication artifacts

## Dependencies

- Live reference pod: `pod.vardeman.me:3000/vault/` (107 notes, stable)
- OpenProse skills installed in Claude Code
- cogitarelink-solid `make reset` available for pod rebuild if needed
