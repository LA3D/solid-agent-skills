---
name: pod-query
description: Construct SPARQL queries guided by SHACL shapes — use sh:agentInstruction patterns and pod vocabulary
---

# Pod Query Workflow

PREREQUISITE: Read `../pod-shared/SKILL.md` first for connection setup,
output format, and the four-layer model.

This skill teaches shape-guided SPARQL querying. Don't guess predicates —
let the pod's SHACL shapes tell you what to query and how.

## Step 1: Find the Relevant Shape

Shapes live in the procedures container:

```bash
solid-pod shapes <pod-url>procedures/shapes/
```

Each shape targets a resource type and includes `sh:agentInstruction`
with ready-to-use SPARQL patterns. Find the shape matching what you
want to query.

If you don't know which shape to use, check what types exist:

```bash
solid-pod types <pod-url>
```

This reads the Type Index — it maps RDF classes to container URLs.
The class name tells you which shape applies.

## Step 2: Read the Agent Instruction

The `sh:agentInstruction` on a shape contains SPARQL patterns written
for agents. Example from a concept-note shape:

```
Query concepts using:
SELECT ?c ?label ?broader WHERE {
  ?c a skos:Concept ;
     skos:prefLabel ?label .
  OPTIONAL { ?c skos:broader ?broader }
}
```

Use this pattern directly or adapt it. The shape author already figured
out which predicates matter — trust the instruction.

## Step 3: Execute the Query

```bash
solid-pod sparql <source-url> "<query>"
```

The first argument is the **source URL** — the LDP container (or pod root)
that Comunica traverses. Scoping matters:

| Source URL | Scope |
|-----------|-------|
| `<pod-url>` | Entire pod (slow, broad) |
| `<pod-url>resources/concepts/` | Single container (fast, focused) |
| `<pod-url>resources/` | All resource sub-containers |

Start narrow. Widen only if you don't find what you need.

## Step 4: Interpret Results

Results come back as JSON (SPARQL results format). Each binding row
maps variable names to values. URIs are full URLs you can dereference
with `solid-pod read`.

## Common Query Patterns

### Find resources by type

```sparql
SELECT ?s ?label WHERE {
  ?s a skos:Concept ;
     skos:prefLabel ?label .
}
```

### Find resources by tag/subject

```sparql
SELECT ?s ?label WHERE {
  ?s dct:subject "knowledge-graphs" ;
     skos:prefLabel ?label .
}
```

### Find related resources

```sparql
SELECT ?related ?label WHERE {
  <resource-url> skos:related ?related .
  ?related skos:prefLabel ?label .
}
```

### Find resources by date range

```sparql
SELECT ?s ?label ?date WHERE {
  ?s a skos:Concept ;
     skos:prefLabel ?label ;
     dct:created ?date .
  FILTER (?date >= "2026-01-01"^^xsd:date)
}
```

### Reverse lookup (who links to X?)

Two approaches:

```bash
# CLI shortcut
solid-pod backlinks <resource-url>

# Or raw SPARQL
solid-pod sparql <pod-url> "SELECT ?s ?p WHERE { ?s ?p <resource-url> }"
```

### Count resources by type

```sparql
SELECT ?type (COUNT(?s) AS ?count) WHERE {
  ?s a ?type .
}
GROUP BY ?type
ORDER BY DESC(?count)
```

### Find resources with missing properties

```sparql
SELECT ?s ?label WHERE {
  ?s a skos:Concept ;
     skos:prefLabel ?label .
  FILTER NOT EXISTS { ?s dct:subject ?tag }
}
```

## Text Search

When you need text matching rather than structured SPARQL, use `search`:

```bash
solid-pod search <container-url> "<terms>"
```

Search scans `.meta` sidecars for literal values matching your terms.
It tries OSLC Query first (if the pod supports it), then falls back to
direct SPARQL over `.meta` files.

```json
{
  "source": "http://pod.vardeman.me:3000/vault/resources/concepts/",
  "terms": "knowledge",
  "method": "sparql",
  "metaSources": 107,
  "results": [
    {
      "resource": "http://pod.vardeman.me:3000/vault/resources/concepts/knowledge-representation-for-agents.md",
      "label": "Knowledge Representation for Agents",
      "matchedPredicate": "http://www.w3.org/2004/02/skos/core#prefLabel",
      "matchedValue": "Knowledge Representation for Agents"
    }
  ]
}
```

**When to use `search` vs `sparql`**:

| Use case | Command |
|----------|---------|
| Find resources by keyword | `search` — text matching across literals |
| Structured graph patterns | `sparql` — joins, filters, aggregates |
| "What mentions X?" | `search` — fast, no query construction |
| "How does X relate to Y?" | `sparql` — follow predicates, build patterns |

Use `search` for discovery (what's here?), then `sparql` for precise
queries once you know the predicates and structure.

## Container .meta Queries

Container `.meta` files also have `sh:agentInstruction`. Read them
for container-specific query guidance:

```bash
solid-pod read <container-url>.meta
```

The instruction might say something like "query this container's concepts
by their SKOS broader/narrower hierarchy" — more specific than the
shape-level guidance.

## Vocabulary Quick Reference

The pod vocabulary uses standard prefixes. These are the most common
predicates you'll encounter:

| Prefix | Namespace | Used for |
|--------|-----------|----------|
| `skos:` | SKOS Core | Labels, relations, schemes |
| `dct:` | Dublin Core Terms | Dates, subjects, types, descriptions |
| `prov:` | PROV-O | Provenance, attribution, derivation |
| `vault:` | Pod ontology | Domain-specific edge types |

Key predicates by use case:

| Want to find... | Use predicate |
|----------------|---------------|
| Resource name | `skos:prefLabel` |
| Tags/topics | `dct:subject` |
| Creation date | `dct:created` |
| Related items | `skos:related` |
| Broader category | `skos:broader` |
| Resource type | `rdf:type` (or `a` shorthand) |
| Provenance | `prov:wasGeneratedBy`, `prov:wasDerivedFrom` |

## Decision Tree

```
Query returned results?       -> Read interesting resources with /pod-browse
No results?                   -> Widen source URL or check predicate spelling
Just need keyword matching?   -> solid-pod search (text search, no SPARQL needed)
Need to create something?     -> /pod-create (shape-guided resource creation)
Wrong predicates?             -> Re-read sh:agentInstruction from the shape
```

## Gotchas

- **Source scoping**: The source URL determines what Comunica traverses.
  Using the pod root queries everything but is slow. Use the most specific
  container URL that covers your query.

- **Auto .meta discovery**: When you query a container URL (ending in `/`),
  the CLI automatically discovers `.meta` sidecar URLs and includes them as
  Comunica sources. This means SPARQL queries against container URLs can
  find triples from `.meta` files (like `skos:prefLabel`, `dct:subject`)
  transparently. Use `--no-meta` to disable this if you only want
  container-level triples.

- **Prefix expansion**: SPARQL queries need full prefix declarations or
  the CLI handles them. Check that `solid-pod sparql` expands standard
  prefixes automatically — if not, add PREFIX lines.

- **No CONSTRUCT in Comunica link-traversal**: Stick to SELECT queries.
  CONSTRUCT and DESCRIBE may not work reliably over link-traversal sources.
