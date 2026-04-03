---
name: pod-discover
description: Workflow for discovering an unknown Solid Pod — navigate the four-layer self-description to understand structure, vocabularies, shapes, and query patterns
---

# Pod Discovery Workflow

PREREQUISITE: Read `../pod-shared/SKILL.md` first for connection setup,
output format, and the four-layer model.

This skill teaches the arrival sequence for an unknown Solid Pod. Follow
these steps in order — each step builds on what the previous one revealed.

## Step 1: Get Pod Overview (L1)

```bash
solid-pod info <pod-url>
```

The response comes from `.well-known/solid`. Read these fields:

| Field | What it tells you |
|-------|-------------------|
| `@type` | Node kind: `pim:Storage`, `void:Dataset`, `dcat:DataService` |
| `dct:conformsTo` | Profiles the pod supports (e.g., `SolidPodProfile`) |
| `void:vocabulary` | Vocabularies in use (SKOS, DCT, PROV, vault ontology) |
| `void:feature` | Feature flags (e.g., `fabric:LDPBrowse` = browse via LDP) |
| `void:class` | RDF classes present (what types of resources exist) |
| `void:entities` | Approximate resource count |

This is your map. The vocabularies tell you what predicates to expect.
The classes tell you what kinds of things are in the pod.

## Step 2: Read the Pod Root (L1-L2)

```bash
solid-pod read <pod-url>
```

Two things to look at:

1. **Container listing** (`ldp:contains`): The top-level containers. A PARA pod
   typically has `projects/`, `areas/`, `resources/`, `archive/`, `procedures/`,
   `settings/`.

2. **Affordances** (`affordances.describedby`): Points to the root `.meta`.
   Read it for pod-level metadata and `sh:agentInstruction` if present.

```bash
# Follow the describedby affordance to get root metadata
solid-pod read <pod-url>.meta
```

## Step 3: Check the PROF Profile (L2)

If Step 1 showed a `dct:conformsTo` pointing to a `SolidPodProfile`, dereference it:

```bash
solid-pod read <pod-url>settings/solidPodProfile
```

Look for `prof:hasResource` entries with W3C roles:

| Role | Points to |
|------|-----------|
| `role:schema` | Vocabulary/ontology files |
| `role:constraints` | SHACL shapes |
| `role:guidance` | SPARQL examples, agent instructions |

These ResourceDescriptors are the connective tissue between layers.
They tell you where to find everything else.

## Step 4: Discover SHACL Shapes (L3)

```bash
solid-pod shapes <pod-url>procedures/shapes/
```

Each shape defines a resource type. The critical field is `sh:agentInstruction` —
it contains natural language guidance telling you:

- Which SPARQL patterns to use for this type
- Which predicates are most important
- How to interpret the results

Example shape output (abbreviated):
```json
{
  "@type": "sh:NodeShape",
  "sh:targetClass": "skos:Concept",
  "sh:agentInstruction": "Query concepts using: SELECT ?c ?label ?broader WHERE { ?c a skos:Concept ; skos:prefLabel ?label . OPTIONAL { ?c skos:broader ?broader } }",
  "sh:property": [
    { "sh:path": "skos:prefLabel", "sh:minCount": 1 },
    { "sh:path": "skos:broader" },
    { "sh:path": "skos:related" }
  ]
}
```

The `sh:agentInstruction` IS the documentation. Read it.

## Step 5: Explore a Container (L2-L3)

Pick a container from the listing in Step 2:

```bash
solid-pod read <pod-url>resources/concepts/
```

The response shows `ldp:contains` links (the resources in this container).
Check `affordances.describedby` for the container's `.meta` — it may have
its own `sh:agentInstruction` with container-specific guidance.

```bash
solid-pod read <pod-url>resources/concepts/.meta
```

Container `.meta` often includes `dct:type` (PARA category, memory partition)
which tells you how this container fits into the pod's organizational scheme.

## Step 6: Try a Guided Query (L3-L4)

Use the SPARQL pattern from the shape's `sh:agentInstruction`:

```bash
solid-pod sparql <pod-url>resources/concepts/ \
  "SELECT ?c ?label WHERE { ?c a skos:Concept ; skos:prefLabel ?label }"
```

Note: the first argument to `sparql` is the source URL. Comunica queries
over that LDP container (and its contents) specifically. To query across
the whole pod, use the pod root URL.

## Decision Tree

After completing discovery, decide your next action:

```
Want to browse resources?     -> /pod-browse
Want to query with SPARQL?    -> /pod-query
Want to create a resource?    -> /pod-create
Need to understand a shape?   -> Re-read sh:agentInstruction from Step 4
```

## Key Principle

The pod describes itself. You don't need prior knowledge of its schema.
Follow the affordances at each step — they tell you what to do next.
The `sh:agentInstruction` text is procedural guidance written for agents.
Trust it.

## Gotchas

- **Comunica gap**: Link-traversal follows `ldp:contains` but NOT `describedby`
  headers on non-RDF resources. You must fetch `.meta` files explicitly.
- **Source scoping**: `solid-pod sparql` queries the specified URL as source.
  Use a container URL to scope queries to that container's contents.
- **No auth in dev**: CSS allow-all config means no authentication needed.
  Production pods require Solid-OIDC (Bashlib handles this).
