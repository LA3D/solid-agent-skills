# Solid Protocol Patterns

## Pod Discovery Path (validated in Phase 1)

An agent arriving at a pod follows this five-step path:

1. `GET /vault/.well-known/solid` → VoID + DCAT (types, vocabularies, conformsTo, feature flags)
2. Dereference `SolidPodProfile` → PROF ResourceDescriptors (schemas, constraints, guidance)
3. `GET /vault/settings/publicTypeIndex` → class-to-container routing (skos:Concept → /resources/concepts/)
4. `GET container/.meta` → sh:agentInstruction, dct:type (PARA category, memory partition)
5. `GET /vault/procedures/shapes/*.ttl` → SHACL shapes with sh:agentInstruction (query patterns)

## LDP Operations

```
GET /container/           Accept: text/turtle  → ldp:contains listing
GET /resource.md          → Markdown content (text/markdown)
GET /resource.md.meta     Accept: text/turtle  → RDF metadata sidecar
PUT /container/new.md     Content-Type: text/markdown  → create resource
PATCH /resource.md.meta   Content-Type: text/n3  → update metadata (N3 Patch)
```

## .meta Sidecar Pattern

CSS stores per-resource metadata in `.meta` companion files. The `describedby` Link header
on each resource points to its `.meta`. These contain SKOS/DCT/PROV triples generated
from vault frontmatter.

**Comunica gap**: link-traversal follows ldp:contains but NOT describedby headers on
non-RDF resources. Skills must discover .meta files explicitly.

## N3 Patch Format (for PATCH to .meta)

```
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts {
    <subject> <predicate> <object> .
}.
```

## SHACL 1.2 Agent Guidance

- `sh:agentInstruction` — procedural guidance ("what the agent should do")
- `sh:intent` — declarative rules ("what should hold true")
- Both are non-validating shape characteristics (§8)
- Used on NodeShapes and PropertyShapes
