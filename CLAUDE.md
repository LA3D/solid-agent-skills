# solid-agent-skills

Agent skills for Solid Pod interaction — discover, browse, query, create conformant resources.

## Project Context

This project builds on the SOLID Pod Integration (cogitarelink-solid). The reference
Pod is now at **Rung 1.4** state — wiki-memory L3 reference profile with storage
description router (D44), affordance catalog (D52), body-projection listener (D58/D71),
class-based SHACL dispatch (D78), JSON-LD context (D79), predicate-level governance
(D81), and Memento time-travel (D61–D68). Architectural decisions D1–D81 + K1–K3 are
canonical at `cogitarelink-solid/.claude/rules/decisions-index.md`.

If the Obsidian vault (`~/Obsidian/obsidian`) is available as an additional working
directory, it contains the master project plan and decisions log under
`01 - Projects/SOLID Pod Integration/`. Use it for architectural context and
decision history.

If the vault is not available, the in-repo instructions and `.claude/memory/` provide
sufficient context for development work.

## Skill suite reset (2026-05-15)

The 5 Phase 2 skills (`pod-shared`, `pod-discover`, `pod-browse`, `pod-create`,
`pod-query`) were removed in May 2026 after the reference Pod underwent major
architectural changes (D42–D81). The skills assumed Phase 2's generic PARA container
layout, `procedures/shapes/` discovery path, and single-stage resource creation —
all superseded by wiki-memory L3 (D70–D81). The legacy state is preserved at git
tag `phase-2-skills-archive`.

The replacement suite is being rebuilt incrementally, one skill per sprint, each
validated via the skill-creator harness (with-skill vs without-skill eval against
the live Pod). Planned skills, foundation-first:

1. **`pod-discover`** — Cold-start arrival: storage description → affordance catalog → Type Index → JSON-LD context → class-based SHACL dispatch
2. **`pod-read`** — Read a typed resource with dual-layer awareness (body markdown + `.meta` projection per D58/D71/D81)
3. **`pod-query`** — Comunica SPARQL with explicit `.meta` sources (RQ-Pod-4 workaround), class-targeted queries
4. **`pod-write`** — Two-stage commit (D73): low-ceremony POST to `/wiki/working/`, then `mem:Crystallize` to durable container
5. **`pod-memento`** — Time-travel queries (RFC 7089) — TimeGate, TimeMap, version-specific reads
6. **`pod-affordance-inspect`** — Read affordance descriptors at `/meta/affordances/` to learn substrate behaviors

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

### Agent Skills

See "Skill suite reset" above. The skills directory was reset 2026-05-15 against
the new Pod architecture and is being rebuilt one skill per sprint.

### Key Technical Context

- **SHACL 1.2 `sh:agentInstruction`** (§8.3) is the crucial piece for agent guidance — shapes tell agents which SPARQL patterns to use (D50)
- **Class-based shape targeting** (D78) — shapes target `rdf:type` (`wiki:Concept`, `wiki:Source`, etc.) via `sh:targetClass`. Type Index does double duty for routing class → container
- **Body-affordance projection** (D58/D71) — body markdown wikilinks `[[Note]]{.class}` project to `.meta` triples via `MarkdownProjectionListener`. Dual-layer linking at single-request cost
- **Predicate-level governance** (D81 Model A) — SHACL shape declares which predicates the substrate governs; agent owns the rest
- **Comunica `.meta` traversal gap** (RQ-Pod-4) — Comunica link-traversal follows `ldp:contains` but skips `describedby` on `text/markdown` resources. Workaround: explicit `default-graph-uri` parameters pointing at `.meta` URLs
- **Pod self-description (Rung 1.5 hypothesis)** — whether agents reliably discover and use the affordance architecture cold is the open question Rung 1.5 measures (RQ-Discovery-1)

### Discovery chain on the current Pod

```
GET /vault/ (Pod root)
  → Link: <.../.well-known/solid>; rel="solid:storageDescription"  (D44)
  ↓
GET /vault/.well-known/solid
  → void:vocabulary <skos:>, <dct:>, <prov:>, <cito:>, <wiki:>, ...   (D49)
  → wiki:contextDocument  </meta/context.jsonld>                     (D79)
  → wiki:shapeCatalog     </meta/shapes/>
  → wiki:affordanceCatalog </meta/affordances/>                       (D52)
  → wiki:typeIndex        </settings/publicTypeIndex>                  (D8)
  → rdfs:seeAlso  </wiki/{pages,sources,people,procedures,working}/>  (D76)
  ↓
GET /vault/meta/affordances/   → ldp:contains markdown-projection, hub-view, breadcrumb-view, memento
GET /vault/meta/context.jsonld → canonical prefix→IRI registry, short-form predicates
GET /vault/settings/publicTypeIndex → class → container routing
```

Every step is standard LDP + Solid Protocol. Storage description is the entry point
(D44 replaced the legacy `.well-known/void` pattern). Affordance catalog and
JSON-LD context surface substrate behaviors agents need to know about.

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
