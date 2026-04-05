# solid-agent-skills

Agent skills for Solid Pod interaction — discover, browse, query, create conformant resources.

## Project Context

This project builds on Phase 1 of the SOLID Pod Integration (cogitarelink-solid).
If the Obsidian vault (`~/Obsidian/obsidian`) is available as an additional working directory,
it contains the master project plan, decisions log (D1-D35), and research context under
`01 - Projects/SOLID Pod Integration/`. Use it for architectural context and decision history.

If the vault is not available, the in-repo instructions and `.claude/memory/` provide
sufficient context for development work.

## Architecture

Agent skills for Solid Pod interaction, not a traditional CLI. Skills are composable,
context-aware, and integrated into the agent's reasoning loop. Evaluate the Vercel Skills
framework (https://skills.sh/, https://github.com/vercel-labs/skills) as a substrate.

### CLI Commands (11)

| Command | Purpose |
|---------|---------|
| `solid-pod info <url>` | GET .well-known/solid, return VoID/DCAT as JSON-LD |
| `solid-pod read <url>` | GET resource with Link headers and .meta sidecar |
| `solid-pod sparql <url> <query>` | SPARQL via Comunica (auto .meta discovery) |
| `solid-pod shapes <url>` | List SHACL shapes with sh:agentInstruction |
| `solid-pod links <url>` | Outgoing references from .meta |
| `solid-pod types <url>` | rdf:type values with counts |
| `solid-pod backlinks <url>` | Reverse references |
| `solid-pod search <url> <terms>` | Text search (OSLC-ready, SPARQL fallback) |
| `solid-pod properties <url>` | Predicate usage stats from .meta |
| `solid-pod create <url>` | PUT resource + PATCH .meta |
| `solid-pod patch <url>` | N3 Patch .meta sidecar |

### Agent Skills (5)

| Skill | Purpose | Pod Discovery Layer |
|-------|---------|-------------------|
| `/pod-discover` | Read `.well-known/solid` -> PROF profile -> vocabularies, shapes | L1-L2 |
| `/pod-browse` | Navigate LDP containers, follow `.meta`, read `sh:agentInstruction` | L2-L3 |
| `/pod-query` | Construct SPARQL from shape guidance, text search, source discovery | L3-L4 |
| `/pod-create` | Read SHACL shape, generate conformant resource, PUT + PATCH `.meta` | L3 |

### Key Technical Context

- **SHACL 1.2 `sh:agentInstruction`** (S8.3) is the crucial piece for agent guidance — shapes tell agents which SPARQL patterns to use
- **PROF ResourceDescriptors** with W3C roles (`role:schema`, `role:constraints`, `role:guidance`) provide the connective tissue between discovery layers
- **Comunica link-traversal gap**: follows `ldp:contains` but NOT `describedby` headers on non-RDF resources. Skills must handle `.meta` discovery explicitly.
- **Pod self-description validated**: zero-shot agent tests confirmed agents can discover pod structure from metadata alone

### Four-Layer Self-Description

```
L1: .well-known/solid    -> VoID + DCAT (discovery)
L2: SolidPodProfile      -> PROF ResourceDescriptors (structure)
L3: /procedures/shapes/  -> SHACL + sh:agentInstruction (validation)
L4: /procedures/queries/ -> SPARQL examples (guidance)
```

## Tech Stack

- **TypeScript** — Solid ecosystem is JS/TS (Bashlib, Comunica, @inrupt/solid-client)
- **Bashlib** (SolidLabResearch/Ghent) — Solid-OIDC auth, WebID discovery, LDP CRUD
- **Comunica** — SPARQL federation over LDP resources
- **@inrupt/solid-client** — Solid data access SDK
- **rdf-validate-shacl** or **shacl-engine** — SHACL validation

## Sibling Projects

| Repo | Purpose |
|------|---------|
| `cogitarelink-solid` (LA3D) | Reference Solid Pod (CSS v8 + vault content) |
| `cogitarelink-fabric` (LA3D) | Knowledge fabric nodes (Oxigraph + FastAPI) |
| `rlm` (LA3D) | RLM agent substrate (dspy.RLM) |

Local paths to sibling repos belong in `CLAUDE.local.md` (gitignored, personal).

## Developer Setup

### Personal context (CLAUDE.local.md)

Create a `CLAUDE.local.md` in the repo root for your local paths, vault references,
and personal preferences. This file is gitignored and never shared.

See `CLAUDE.local.md.example` for a template.

### Reference pod

A running Solid Pod is needed for skill development and testing.
See the `cogitarelink-solid` repo for setup instructions (`make reset` creates a
reproducible pod). Pod URL: `http://pod.vardeman.me:3000/vault/`

## Git Protocol

Prefix: `[Agent: Claude]`
Co-Author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
Never force push. Stage specific files.
