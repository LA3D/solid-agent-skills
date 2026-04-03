# solid-agent-skills: Project Structure Design

**Date**: 2026-04-03
**Status**: Approved for experimentation
**Context**: Phase 2 of SOLID Pod Integration (cogitarelink-solid Phase 1 complete)

---

## Problem

Agents need composable tools to discover, navigate, query, and create resources
on Solid Pods. No existing Solid CLI is designed for LLM-based agents. Bashlib
is human-oriented. The pod's self-description (validated in Phase 1) provides
the affordances — agents need tools that surface them.

## Architecture: CLI + Skills

Two layers in one repo:

1. **CLI** (`solid-pod`) — TypeScript binary with subcommands. Comunica for
   reads/queries, raw fetch for writes and Link header inspection. Output is
   JSON-LD compact form.

2. **Skills** (`skills/`) — SKILL.md files following the agentskills.io spec.
   Teach agents multi-step workflows (discover, browse, query, create).
   Skills invoke CLI commands via `Bash()`.

No MCP servers. No human-readable output. Agent-first throughout.

## Design Decisions

- **JSON-LD compact form as default output** — Valid JSON for agents, valid RDF
  for downstream tools. A shared `@context` maps short keys to full URIs.
  Agents see readable JSON; rdflib/Comunica see triples.

- **Comunica as primary read layer** — SPARQL over LDP via link-traversal.
  Known gap: doesn't follow `describedby` headers on non-RDF resources.
  CLI handles `.meta` discovery via raw HTTP.

- **Raw fetch for writes and affordances** — PUT, PATCH (N3 Patch), and HTTP
  Link header extraction require direct HTTP access.

- **Vault-inspired command surface** — Commands mirror Obsidian CLI patterns
  that work well for agentic navigation. Same cognitive model for vault and pod.

- **Raw SPARQL escape hatch** — `solid-pod sparql` for direct Comunica queries,
  like how `gws` exposes raw Google API access alongside helper commands.

- **Link headers as affordances** — Every `read` response surfaces HTTP Link
  headers (`describedby`, `type`, `constrainedBy`, `acl`) as navigation cues
  telling the agent what it can do next.

## Project Structure

```
solid-agent-skills/
├── src/                          # TypeScript CLI source
│   ├── cli.ts                    # Entry point, subcommand routing
│   ├── commands/                 # One file per command
│   │   ├── info.ts               # .well-known/solid -> VoID/DCAT
│   │   ├── read.ts               # GET resource + Link headers + .meta
│   │   ├── search.ts             # SPARQL text search
│   │   ├── backlinks.ts          # Reverse link query
│   │   ├── links.ts              # Outgoing refs from .meta
│   │   ├── types.ts              # SKOS concepts / dct:type browse
│   │   ├── properties.ts         # Predicate inventory
│   │   ├── shapes.ts             # SHACL shapes + sh:agentInstruction
│   │   ├── sparql.ts             # Raw SPARQL via Comunica
│   │   ├── create.ts             # PUT resource + PATCH .meta
│   │   └── patch.ts              # N3 Patch to .meta
│   ├── lib/                      # Shared internals
│   │   ├── comunica.ts           # Comunica query engine wrapper
│   │   ├── http.ts               # Raw fetch + Link header parsing
│   │   ├── jsonld.ts             # JSON-LD compact output formatting
│   │   └── context.ts            # Shared @context definitions
│   └── index.ts                  # Library exports (for programmatic use)
├── skills/                       # Agent skills (agentskills.io spec)
│   ├── pod-discover/
│   │   └── SKILL.md              # Workflow: arrive at unknown pod
│   ├── pod-browse/
│   │   └── SKILL.md              # Workflow: explore containers
│   ├── pod-query/
│   │   └── SKILL.md              # Workflow: shape-guided SPARQL
│   ├── pod-create/
│   │   └── SKILL.md              # Workflow: conformant resource creation
│   └── pod-shared/
│       ├── SKILL.md              # Shared: auth, pod URL, four-layer model
│       └── references/
│           ├── solid-patterns.md # Discovery path, LDP ops, N3 Patch
│           └── shacl-guidance.md # sh:agentInstruction, shape reading
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── docs/plans/
```

## Command Surface

| Command | Vault Parallel | Purpose |
|---|---|---|
| `solid-pod info <url>` | `obsidian vault` | GET `.well-known/solid`, return VoID/DCAT |
| `solid-pod read <url>` | `obsidian read` | GET resource + Link headers + .meta |
| `solid-pod search <url> <query>` | `obsidian search` | SPARQL text search across pod |
| `solid-pod backlinks <url>` | `obsidian backlinks` | Reverse link query |
| `solid-pod links <url>` | `obsidian links` | Outgoing refs from .meta |
| `solid-pod types <url>` | `obsidian tags` | Browse dct:type / SKOS concepts |
| `solid-pod properties <url>` | `obsidian properties` | Predicate inventory |
| `solid-pod shapes <url>` | (new) | SHACL shapes + sh:agentInstruction |
| `solid-pod sparql <url> <query>` | (raw) | Direct SPARQL via Comunica |
| `solid-pod create <url> [--shape]` | `obsidian append` | PUT resource + PATCH .meta |
| `solid-pod patch <url>` | (raw) | N3 Patch to .meta |

## Output Format

JSON-LD compact form with shared `@context`. Example (`solid-pod read`):

```json
{
  "@context": {
    "ldp": "http://www.w3.org/ns/ldp#",
    "dct": "http://purl.org/dc/terms/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "solid": "http://www.w3.org/ns/solid/terms#"
  },
  "@id": "/vault/resources/concepts/context-graphs.md",
  "dct:format": "text/markdown",
  "content": "# Context Graphs\n...",
  "affordances": {
    "describedby": "/vault/resources/concepts/context-graphs.md.meta",
    "type": "ldp:Resource",
    "constrainedBy": "/vault/procedures/shapes/concept-note.ttl"
  },
  "meta": {
    "dct:title": "Context Graphs",
    "skos:related": [
      {"@id": "/vault/resources/concepts/progressive-disclosure.md"}
    ]
  }
}
```

The `affordances` object surfaces HTTP Link headers as agent navigation cues.

## Skills Layer

Follows the `gws-shared` pattern (Google Workspace CLI skills on this machine):

- **pod-shared**: Cross-cutting context — how to connect, four-layer
  self-description model, what affordances mean, auth patterns
- **pod-discover**: Multi-step workflow for arriving at an unknown pod
- **pod-browse**: Navigating containers, following affordances
- **pod-query**: Constructing SPARQL from shape guidance
- **pod-create**: Reading a SHACL shape, creating a conformant resource

Skills reference CLI commands. `references/` directories hold Solid protocol
knowledge (progressive disclosure — loaded only when needed by the agent).

## Tech Stack

- **Comunica** (`@comunica/query-sparql-link-traversal`) — SPARQL over LDP
- **Native fetch** — writes, .meta discovery, Link header extraction
- **Commander.js** (or similar) — CLI subcommand routing
- **jsonld** npm package — JSON-LD compaction with shared @context
- **TypeScript** — Solid ecosystem is JS/TS

## Open Questions (to resolve through experimentation)

- Exact `@context` shape — which prefixes, how much to inline vs reference by URL
- Comunica configuration — explicit sources vs link-traversal for each command
- Auth story — open pod for now, Solid-OIDC deferred
- Whether `search` needs a separate full-text index or SPARQL `CONTAINS` suffices
- Command naming may evolve as we learn what agents actually call

## References

- Phase 1 findings: cogitarelink-solid (107 notes, agent navigation validated)
- Agent Skills spec: agentskills.io/specification
- Vercel Skills CLI: github.com/vercel-labs/skills
- Anthropic tool design: anthropic.com/engineering/writing-tools-for-agents
- Obsidian CLI: vault navigation model for command surface
