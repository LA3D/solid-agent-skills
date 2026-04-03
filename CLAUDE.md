# solid-agent-skills

Agent skills for Solid Pod interaction — discover, browse, query, create conformant resources.

**Vault**: `~/Obsidian/obsidian` — launch with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`

## Project Context

This project builds on Phase 1 of the SOLID Pod Integration (cogitarelink-solid):
- **Reference pod**: `~/dev/git/LA3D/agents/cogitarelink-solid` (`make reset` = working pod at `http://pod.vardeman.me:3000`)
- **Phase 1 findings**: `~/Obsidian/obsidian/01 - Projects/SOLID Pod Integration/Solid Pod Phase 1 - Vertical Slice Findings.md`
- **Project plan**: `~/Obsidian/obsidian/01 - Projects/SOLID Pod Integration/SOLID-Pod-PLAN.md`
- **Decisions**: `~/Obsidian/obsidian/01 - Projects/SOLID Pod Integration/SOLID-Pod-Decisions.md` (D1-D35)
- **Fabric synergy**: `~/Obsidian/obsidian/01 - Projects/SOLID Pod Integration/Fabric-Pod Synergy - Unified Design Thesis.md`

## Architecture

Agent skills for Solid Pod interaction, not a traditional CLI. Skills are composable, context-aware, and integrated into the agent's reasoning loop. Evaluate the Vercel Skills framework (https://skills.sh/, https://github.com/vercel-labs/skills) as a substrate.

### Skill Candidates

| Skill | Purpose | Pod Discovery Layer |
|-------|---------|-------------------|
| `/pod-discover` | Read `.well-known/solid` → PROF profile → vocabularies, shapes | L1-L2 |
| `/pod-browse` | Navigate LDP containers, follow `.meta`, read `sh:agentInstruction` | L2-L3 |
| `/pod-query` | Construct SPARQL from shape guidance, handle source discovery | L3-L4 |
| `/pod-create` | Read SHACL shape, generate conformant resource, PUT + PATCH `.meta` | L3 |

### Key Technical Context

- **SHACL 1.2 `sh:agentInstruction`** (§8.3) is the crucial piece for agent guidance — shapes tell agents which SPARQL patterns to use
- **PROF ResourceDescriptors** with W3C roles (`role:schema`, `role:constraints`, `role:guidance`) provide the connective tissue between discovery layers
- **Comunica link-traversal gap**: follows `ldp:contains` but NOT `describedby` headers on non-RDF resources. Skills must handle `.meta` discovery explicitly.
- **Pod self-description validated**: zero-shot agent tests confirmed agents can discover pod structure from metadata alone (D33)

### Four-Layer Self-Description (from fabric)

```
L1: .well-known/solid    → VoID + DCAT (discovery)
L2: SolidPodProfile      → PROF ResourceDescriptors (structure)
L3: /procedures/shapes/  → SHACL + sh:agentInstruction (validation)
L4: /procedures/queries/ → SPARQL examples (guidance)
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
| `~/dev/git/LA3D/agents/cogitarelink-solid` | Reference Solid Pod (CSS v8 + vault content) |
| `~/dev/git/LA3D/agents/cogitarelink-fabric` | Knowledge fabric nodes (Oxigraph + FastAPI) |
| `~/dev/git/LA3D/agents/rlm` | RLM agent substrate (dspy.RLM) |

## Key Commands

```bash
# Reference pod (must be running for skill development/testing)
cd ~/dev/git/LA3D/agents/cogitarelink-solid && make up
# Pod URL: http://pod.vardeman.me:3000/vault/
# Requires: 127.0.0.1 pod.vardeman.me in /etc/hosts
```

## Git Protocol

Prefix: `[Agent: Claude]`
Co-Author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
Never force push. Stage specific files.

## Identity

ORCID: https://orcid.org/0000-0003-4091-6059
Notre Dame ROR: https://ror.org/00mkhxb43
