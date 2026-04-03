# solid-agent-skills — Session Memory

## Project State (as of 2026-04-03)

**Repo**: `~/dev/git/LA3D/agents/solid-agent-skills`
**Status**: Scaffolded, ready for brainstorming + design

## Key Design Decision

Build Solid Pod interaction as **agent skills** (evaluate Vercel Skills framework), not a traditional CLI binary.
Skills are composable, context-aware, and integrated into the agent's reasoning loop.

## Phase 1 Reference

- Reference pod at `http://pod.vardeman.me:3000/vault/` (repo: cogitarelink-solid, `make reset`)
- 107 vault notes imported with .meta RDF sidecars
- Self-describing pod validated via zero-shot agent navigation (D33)
- Comunica link-traversal has .meta discovery gap — skills must handle describedby explicitly
- sh:agentInstruction (SHACL 1.2 §8.3) is crucial for agent guidance
