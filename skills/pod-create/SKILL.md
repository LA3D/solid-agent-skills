---
name: pod-create
description: Create conformant Solid Pod resources — read SHACL shapes, generate valid content and metadata, PUT + PATCH
---

# Pod Create Workflow

PREREQUISITE: Read `../pod-shared/SKILL.md` first for connection setup,
output format, and the four-layer model.

This skill teaches shape-guided resource creation. Always read the SHACL
shape before creating — it defines what properties are required, what types
are expected, and how the resource should be structured.

## Step 1: Find the Target Container

You need to know where the resource belongs. Two approaches:

**Via Type Index** (recommended):
```bash
solid-pod types <pod-url>
```
The Type Index maps RDF classes to containers. Find the class matching
your resource type — the mapped container URL is your target.

**Via direct knowledge**: If you already know the pod structure
(e.g., concept notes go in `resources/concepts/`), use the URL directly.

## Step 2: Read the SHACL Shape

```bash
solid-pod shapes <pod-url>procedures/shapes/
```

Find the shape targeting your resource type. Read it carefully:

| Shape property | What it means for creation |
|---------------|--------------------------|
| `sh:targetClass` | The `rdf:type` your resource must have |
| `sh:property` with `sh:minCount >= 1` | **Required** — must be in `.meta` |
| `sh:property` with no `sh:minCount` | Optional but recommended |
| `sh:path` | The predicate to use |
| `sh:datatype` | Expected value type (`xsd:string`, `xsd:date`, etc.) |
| `sh:nodeKind sh:IRI` | Value must be a URI (link to another resource) |
| `sh:nodeKind sh:Literal` | Value must be a literal (string, date, number) |
| `sh:name` | Human-readable property name (maps to frontmatter keys) |
| `sh:in` | Allowed values (enumeration) |
| `sh:agentInstruction` | Guidance on how to populate this property |

## Step 3: Generate the Resource Content

For Markdown resources (the common case), create the content body:

```markdown
# Resource Title

Description and content here.
```

Keep content clean — metadata goes in the `.meta` sidecar, not
in YAML frontmatter. The pod separates content from metadata by design.

## Step 4: Generate the .meta Triples

Build triples matching the shape's required and optional properties.
Use the predicates from `sh:path` and the types from `sh:datatype`.

Example for a concept note:

```turtle
<new-concept.md> a skos:Concept ;
    skos:prefLabel "New Concept" ;
    dct:created "2026-04-03"^^xsd:date ;
    dct:subject "knowledge-graphs" ;
    skos:related <../other-concept.md> ;
    prov:wasAttributedTo <https://orcid.org/0000-0003-4091-6059> .
```

Checklist before proceeding:
- [ ] Every `sh:minCount >= 1` property is present
- [ ] `rdf:type` matches `sh:targetClass`
- [ ] Dates use `xsd:date` format (`YYYY-MM-DD`)
- [ ] IRI values are valid URLs (relative or absolute)
- [ ] Literals have correct datatypes

## Step 5: Create the Resource

```bash
solid-pod create <container-url> \
  --slug "resource-name.md" \
  --body "# Resource Title\n\nContent here." \
  --meta '<resource-name.md> a skos:Concept ; skos:prefLabel "Resource Title" ; dct:created "2026-04-03"^^xsd:date .'
```

This does two operations:
1. `PUT` the resource content to `<container-url>resource-name.md`
2. `PATCH` the `.meta` sidecar with the provided triples (N3 Patch format)

## Step 6: Verify the Resource

Read back what was created:

```bash
# Check the content
solid-pod read <container-url>resource-name.md

# Check the metadata
solid-pod read <container-url>resource-name.md.meta
```

Verify:
- Content renders correctly
- `.meta` contains all required triples
- `rdf:type` is correct
- Required properties from the shape are present

## Example: Creating a Concept Note

Full walkthrough from shape to verified resource:

```bash
# 1. Check what shapes exist
solid-pod shapes http://pod.vardeman.me:3000/vault/procedures/shapes/

# 2. Read the concept-note shape (note sh:targetClass, required properties)
# Shape says: skos:prefLabel (required), dct:created (required), dct:subject (optional)

# 3. Create the resource
solid-pod create http://pod.vardeman.me:3000/vault/resources/concepts/ \
  --slug "context-graphs.md" \
  --body "# Context Graphs\n\nSemantic context layers for AI agent reasoning." \
  --meta '<context-graphs.md> a skos:Concept ; skos:prefLabel "Context Graphs" ; dct:created "2026-04-03"^^xsd:date ; dct:subject "agentic-memory" .'

# 4. Verify
solid-pod read http://pod.vardeman.me:3000/vault/resources/concepts/context-graphs.md
solid-pod read http://pod.vardeman.me:3000/vault/resources/concepts/context-graphs.md.meta
```

## Updating Metadata (PATCH)

To add or modify metadata on an existing resource without replacing it:

```bash
solid-pod patch <resource-url>.meta \
  '<resource.md> dct:subject "new-tag" .'
```

This uses N3 Patch format under the hood:

```
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts {
    <resource.md> dct:subject "new-tag" .
}.
```

## Decision Tree

```
Resource created successfully?  -> Verify with solid-pod read
Validation error?               -> Re-read shape, fix missing properties
Need to update metadata?        -> Use solid-pod patch
Want to browse what you made?   -> /pod-browse
Want to query for it?           -> /pod-query
```

## Gotchas

- **Shape first, create second**: Never create without reading the shape.
  Missing required properties means a non-conformant resource that may
  break downstream queries.

- **Content vs metadata**: Markdown content goes in the resource body.
  RDF metadata goes in `.meta`. Don't put YAML frontmatter in pod
  resources — the pod uses `.meta` sidecars instead.

- **Relative URIs in .meta**: Use relative URIs (`<resource-name.md>`)
  for the resource itself and relative paths (`<../other.md>`) for
  links within the same pod. CSS resolves them correctly.

- **Slug naming**: Use lowercase, hyphenated names with the `.md`
  extension for Markdown resources. The slug becomes the URL path segment.

- **Provenance**: Include `prov:wasAttributedTo` and `prov:wasGeneratedBy`
  when creating resources programmatically. This tracks who/what created
  the resource — important for trust and auditability.
