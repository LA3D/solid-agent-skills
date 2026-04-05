---
name: pod-browse
description: Navigate Solid Pod containers — follow LDP structure, read .meta sidecars, use affordances to discover content
---

# Pod Browse Workflow

PREREQUISITE: Read `../pod-shared/SKILL.md` first for connection setup,
output format, and the four-layer model.

This skill teaches container navigation — following LDP structure, reading
metadata sidecars, and using affordances to discover content within a pod
you've already discovered (via `/pod-discover`).

## Step 1: Enter a Container

Start with a container URL (from discovery, Type Index, or direct knowledge):

```bash
solid-pod read <container-url>
```

The response includes:

1. **`ldp:contains`** — list of child resources and sub-containers
2. **`affordances`** — Link headers surfaced as structured data

Look at `affordances` first. They tell you what's available before you
start clicking around.

## Step 2: Read Container Metadata

Check `affordances.describedby` — it points to the container's `.meta`:

```bash
solid-pod read <container-url>.meta
```

The `.meta` sidecar contains critical context:

| Field | What it tells you |
|-------|-------------------|
| `sh:agentInstruction` | How to work with this container's contents |
| `dct:type` | PARA category and/or memory partition |
| `dct:description` | Human-readable container purpose |
| `skos:inScheme` | Which SKOS ConceptScheme this belongs to |

**Read `sh:agentInstruction` before doing anything else.** It contains
procedural guidance written for agents — which predicates to use, how
to interpret contents, what queries make sense here.

## Step 3: Check Shape Constraints

If `affordances.constrainedBy` is present, it points to the SHACL shape
governing resources in this container:

```bash
solid-pod read <shape-url>
```

The shape tells you:
- Required properties (`sh:minCount >= 1`)
- Expected predicates (`sh:path`)
- Value types (`sh:datatype`, `sh:nodeKind`)
- Query patterns (`sh:agentInstruction` on the shape itself)

## Step 4: Browse Child Resources

Pick a resource from the `ldp:contains` listing:

```bash
solid-pod read <child-resource-url>
```

For Markdown resources (`.md` files), you get the content body.
For RDF resources (`.ttl` files), you get parsed triples.

To see the metadata for a specific resource, fetch its `.meta` sidecar:

```bash
solid-pod read <child-resource-url>.meta
```

The `.meta` contains SKOS/DCT/PROV triples — labels, subjects, dates,
provenance, and typed relationships to other resources.

## Step 5: Follow Outgoing Links

Use `links` to see what a resource connects to:

```bash
solid-pod links <resource-url>
```

This shows outgoing relationships: `skos:related`, `skos:broader`,
`dct:subject`, `dct:references`, and vault-specific edge types.

Follow interesting links to navigate the pod's knowledge graph by
hand — each link leads to another resource you can `read`.

## Step 6: Navigate Sub-Containers

If the `ldp:contains` listing includes sub-containers (URLs ending in `/`),
descend into them:

```bash
solid-pod read <sub-container-url>
```

Repeat Steps 1-5 for each sub-container. Each has its own `.meta`
with its own `sh:agentInstruction` and `dct:type`.

## Step 7: Check Predicate Usage

Before querying a container, find out what vocabulary it actually uses:

```bash
solid-pod properties <container-url>
```

This scans all `.meta` sidecars in the container and returns predicate
counts — showing which predicates exist and how many resources use them:

```json
{
  "source": "http://pod.vardeman.me:3000/vault/resources/concepts/",
  "metaSources": 107,
  "properties": [
    {"predicate": "http://www.w3.org/2004/02/skos/core#prefLabel", "count": 107},
    {"predicate": "http://purl.org/dc/terms/subject", "count": 95}
  ]
}
```

Use this to learn the container's actual vocabulary before constructing
SPARQL queries. If a predicate has count 0 or is missing, don't query for it.

## Navigation Patterns

### Top-Down (broad to specific)
```
Pod root → PARA container → sub-container → resource → .meta
```

### Type-Driven (via Type Index)
```
solid-pod types <pod-url> → find class → read mapped container → browse resources
```

### Link-Following (graph walk)
```
Start resource → solid-pod links → follow skos:related → read target → repeat
```

### Reverse Navigation (who links here?)
```
solid-pod backlinks <resource-url> → find incoming references → read referrers
```

## Decision Tree

After browsing, decide your next action:

```
Found relevant resources?     -> Read them, follow their links
Need to know what vocab is used? -> solid-pod properties (predicate stats)
Need structured query?        -> /pod-query (SPARQL guided by shapes)
Want to add a resource?       -> /pod-create (shape-conformant creation)
Lost in the structure?        -> /pod-discover (re-orient from .well-known)
```

## Gotchas

- **Comunica gap**: Link-traversal follows `ldp:contains` but NOT `describedby`
  headers on non-RDF resources. Always fetch `.meta` explicitly — don't rely
  on automatic traversal to find metadata.

- **Markdown resources aren't RDF**: Fetching a `.md` file returns Markdown text,
  not triples. The RDF metadata lives in the `.meta` sidecar, not the resource
  itself.

- **Container vs resource**: URLs ending in `/` are containers (have `ldp:contains`).
  URLs without trailing `/` are resources. The distinction matters for LDP operations.

- **Empty containers**: A container with no `ldp:contains` isn't broken — it may
  be newly created or have resources that haven't been populated yet. Check
  the `.meta` for `sh:agentInstruction` about what belongs here.
