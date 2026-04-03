# solid-agent-skills — Shared Project Knowledge

## Design Decision

Build Solid Pod interaction as **agent skills** (evaluate Vercel Skills framework),
not a traditional CLI binary. Skills are composable, context-aware, and integrated
into the agent's reasoning loop.

## Phase 1 Validated Findings

These findings from the cogitarelink-solid vertical slice inform skill design:

- Pod self-description works: zero-shot agent navigation confirmed agents can discover
  pod structure from metadata alone (`.well-known/solid` -> PROF -> Type Index -> .meta -> SHACL)
- `sh:agentInstruction` (SHACL 1.2 S8.3) is the crucial piece — shapes tell agents
  which predicates and SPARQL patterns to use
- Comunica link-traversal follows `ldp:contains` but NOT `describedby` headers on
  non-RDF resources — skills must handle `.meta` discovery explicitly
- PROF ResourceDescriptors with W3C roles (`role:schema`, `role:constraints`,
  `role:guidance`) provide the connective tissue between discovery layers
- SKOS is the foundation vocabulary for pod content (first use for end-user content in Solid)
- PARA provides container hierarchy; memory partitions modeled as SKOS ConceptSchemes
