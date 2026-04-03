---
name: pod-shared
description: Shared context for all Solid Pod skills — connection, commands, output format, four-layer model
---

# Pod Shared Context

Agent-first CLI for Solid Pod interaction. Commands output JSON-LD compact form
so agents can reason about Pod structure, affordances, and next actions.

## Connection

Pod URL from `SOLID_POD_URL` env var or as first argument to every command.

```bash
export SOLID_POD_URL=http://pod.vardeman.me:3000/vault/
# or pass explicitly:
solid-pod info http://pod.vardeman.me:3000/vault/
```

No auth needed for dev pods (CSS allow-all config). Production pods require
Solid-OIDC — handled transparently by Bashlib when credentials are configured.

## Commands

| Command | Purpose |
|---------|---------|
| `solid-pod info <url>` | Discover pod capabilities via `.well-known/solid` |
| `solid-pod read <url>` | Fetch resource + Link headers + `.meta` sidecar |
| `solid-pod sparql <url> <query>` | SPARQL via Comunica (auto-discovers .meta for containers) |
| `solid-pod shapes <url>` | List SHACL shapes with `sh:agentInstruction` |

| `solid-pod links <url>` | Outgoing references from .meta |
| `solid-pod types <url>` | Browse rdf:type values with counts |
| `solid-pod backlinks <url>` | Find resources linking to this URL |
| `solid-pod create <container-url>` | Create resource (PUT + PATCH .meta) |
| `solid-pod patch <url>` | N3 Patch to .meta sidecar |

Planned:

| Command | Purpose |
|---------|---------|
| `solid-pod search <url> <terms>` | Full-text search (OSLC Query) |
| `solid-pod properties <url>` | Property usage statistics |

## Output Format

Every response is JSON-LD compact form with standard prefixes:

```json
{
  "@context": {
    "ldp": "http://www.w3.org/ns/ldp#",
    "dct": "http://purl.org/dc/terms/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "sh": "http://www.w3.org/ns/shacl#",
    "void": "http://rdfs.org/ns/void#",
    "solid": "http://www.w3.org/ns/solid/terms#",
    "prof": "http://www.w3.org/ns/dx/prof/",
    "prov": "http://www.w3.org/ns/prov#"
  },
  "@id": "http://pod.vardeman.me:3000/vault/resources/concepts/",
  "@type": "ldp:Container",
  "affordances": { ... }
}
```

The `affordances` field surfaces HTTP Link headers as structured data:

| Affordance | Meaning |
|------------|---------|
| `describedby` | URL of the `.meta` sidecar (RDF metadata) |
| `constrainedBy` | SHACL shape that governs this resource |
| `type` | LDP type (`ldp:Container`, `ldp:Resource`, `ldp:BasicContainer`) |
| `acl` | Access control resource |

These tell you what you can do next. Follow them.

## Four-Layer Self-Description

A Solid Pod describes itself through four layers. Each layer adds richer context:

```
L1: .well-known/solid         VoID + DCAT       What's in this pod?
L2: SolidPodProfile           PROF descriptors   Where are schemas, shapes, guidance?
L3: /procedures/shapes/*.ttl  SHACL shapes       How should I query/validate?
L4: /procedures/queries/      SPARQL examples    Show me working queries.
```

**L1 (Discovery)**: `GET /.well-known/solid` returns VoID dataset descriptions
(classes, vocabularies, entity counts) and DCAT catalog metadata. This is the
entry point. The `solid-pod info` command reads this layer.

**L2 (Structure)**: The SolidPodProfile (a PROF Profile) links to schemas
(`role:schema`), constraints (`role:constraints`), and guidance (`role:guidance`)
via PROF ResourceDescriptors. These are the connective tissue between layers.

**L3 (Validation + Guidance)**: SHACL shapes define expected properties per
resource type. Crucially, `sh:agentInstruction` (SHACL 1.2 S8.3) tells agents
which SPARQL patterns to use, which predicates matter, and how to interpret results.
This is the key piece for agent reasoning.

**L4 (Examples)**: Pre-built SPARQL queries generated from shapes. Agents can
use these directly or adapt them.

## Key Principle

The pod describes itself. Read the affordances. Follow the links. The structure
IS the documentation. An agent needs no external configuration to navigate a
well-described pod.

## Discovery Workflow

```
1. solid-pod info <url>        Read .well-known/solid (L1)
2. Follow SolidPodProfile      Find shapes, schemas (L2)
3. solid-pod shapes <url>      Read sh:agentInstruction (L3)
4. solid-pod sparql <url> ...  Use discovered patterns (L3-L4)
5. solid-pod read <url>/path   Browse resources with affordances
```

## Reference

For Solid protocol details (LDP operations, N3 Patch format, `.meta` sidecar
pattern, SHACL agent guidance, Comunica gap), see
[references/solid-patterns.md](references/solid-patterns.md).
