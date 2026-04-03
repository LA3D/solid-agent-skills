# Solid Protocol Patterns

Detailed reference for agents interacting with Solid Pods via LDP, SPARQL, and
the self-description layers. Loaded on demand by pod skills.

## Pod Discovery Path

An agent arriving at a pod follows this five-step path (validated in Phase 1):

1. `GET /vault/.well-known/solid` -- VoID + DCAT (types, vocabularies, conformsTo, feature flags)
2. Dereference `SolidPodProfile` -- PROF ResourceDescriptors (schemas, constraints, guidance)
3. `GET /vault/settings/publicTypeIndex` -- class-to-container routing (skos:Concept -> /resources/concepts/)
4. `GET container/.meta` -- sh:agentInstruction, dct:type (PARA category, memory partition)
5. `GET /vault/procedures/shapes/*.ttl` -- SHACL shapes with sh:agentInstruction (query patterns)

Each step narrows context. By step 3, the agent knows which container holds which
resource types. By step 4, it has procedural guidance for querying.

## LDP Operations

### Read

```
GET /container/           Accept: text/turtle    -> ldp:contains listing
GET /resource.md                                 -> Markdown content (text/markdown)
GET /resource.md.meta     Accept: text/turtle    -> RDF metadata sidecar
```

### Write

```
PUT /container/new.md     Content-Type: text/markdown    -> create resource
POST /container/          Content-Type: text/turtle      -> create with server-assigned slug
                          Slug: my-resource               (hint for server-assigned name)
```

### Update metadata

```
PATCH /resource.md.meta   Content-Type: text/n3          -> N3 Patch to metadata
```

### Delete

```
DELETE /container/resource.md                             -> remove resource
```

### Important headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Accept` | Request | Content negotiation (text/turtle, application/ld+json, text/markdown) |
| `Content-Type` | Request | Body format on PUT/POST/PATCH |
| `Link` | Response | Affordances (describedby, type, acl, constrainedBy) |
| `Slug` | Request | Suggested resource name on POST |
| `Location` | Response | Created resource URL on 201 |

## .meta Sidecar Pattern

CSS (Community Solid Server) stores per-resource metadata in `.meta` companion
files. The `describedby` Link header on each resource points to its `.meta`.

These contain SKOS/DCT/PROV triples. In the reference pod, they hold:

- `dct:title`, `dct:description` -- from vault frontmatter
- `dct:type` -- PARA category and memory partition (SKOS ConceptScheme members)
- `skos:prefLabel`, `skos:related` -- concept labels and wikilink-derived relations
- `prov:wasGeneratedBy`, `prov:wasDerivedFrom` -- provenance from vault import
- `sh:agentInstruction` -- on container `.meta`, procedural guidance for agents

### Accessing .meta

Two equivalent approaches:

```
# Direct path (if you know the pattern)
GET /vault/resources/concepts/context-graphs.md.meta
Accept: text/turtle

# Via Link header (discover from any resource)
GET /vault/resources/concepts/context-graphs.md
# Response includes: Link: <context-graphs.md.meta>; rel="describedby"
```

### Comunica Link-Traversal Gap

Comunica's link-traversal engine follows `ldp:contains` links within containers
but does NOT follow `describedby` headers on non-RDF resources. This means:

- Markdown files (text/markdown) are skipped during content-type parsing
- Their `.meta` sidecars are never discovered via link traversal
- SPARQL queries must use explicit source URIs for `.meta` files

**Workaround**: The CLI discovers `.meta` files explicitly by:
1. Listing container contents via `ldp:contains`
2. Appending `.meta` to each resource URL
3. Passing `.meta` URLs as explicit Comunica sources

This is the primary reason the CLI exists -- bridging the gap between what
Comunica can traverse and what the pod actually contains.

## N3 Patch Format

The Solid Protocol uses N3 Patch for atomic metadata updates via PATCH:

```turtle
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix dct: <http://purl.org/dc/terms/>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.

<> a solid:InsertDeletePatch;
solid:inserts {
    <http://pod.vardeman.me:3000/vault/resources/concepts/new-concept.md>
        dct:title "New Concept" ;
        skos:prefLabel "New Concept" ;
        skos:related <http://pod.vardeman.me:3000/vault/resources/concepts/related-concept.md> .
}.
```

### Insert + Delete (update)

```turtle
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix dct: <http://purl.org/dc/terms/>.

<> a solid:InsertDeletePatch;
solid:deletes {
    <subject> dct:title "Old Title" .
};
solid:inserts {
    <subject> dct:title "New Title" .
}.
```

### Conditional (where clause)

```turtle
@prefix solid: <http://www.w3.org/ns/solid/terms#>.

<> a solid:InsertDeletePatch;
solid:where {
    ?x dct:title "Old Title" .
};
solid:deletes {
    ?x dct:title "Old Title" .
};
solid:inserts {
    ?x dct:title "New Title" .
}.
```

## SHACL 1.2 Agent Guidance

SHACL 1.2 (Section 8) introduces non-validating shape characteristics for agent
consumption:

### sh:agentInstruction

Procedural guidance -- tells the agent what to do:

```turtle
ex:ConceptNoteShape a sh:NodeShape ;
    sh:targetClass vault:ConceptNote ;
    sh:agentInstruction """
        To find concept notes, query:
        SELECT ?note ?title WHERE {
            ?note a vault:ConceptNote ;
                  dct:title ?title ;
                  skos:prefLabel ?label .
        }
        Use skos:related to find connected concepts.
        Check dct:type for PARA category membership.
    """ .
```

### sh:intent

Declarative rules -- what should hold true:

```turtle
ex:TitleProperty a sh:PropertyShape ;
    sh:path dct:title ;
    sh:minCount 1 ;
    sh:intent "Every resource must have a title for discoverability." .
```

### Usage in the reference pod

- Container `.meta` files carry `sh:agentInstruction` for navigating that container
- Shape files in `/procedures/shapes/` carry both `sh:agentInstruction` and
  property-level `sh:intent`
- The `solid-pod shapes` command extracts and presents these instructions

## Type Index

The Solid Type Index maps RDF classes to container URLs:

```turtle
<#conceptEntry> a solid:TypeRegistration ;
    solid:forClass vault:ConceptNote ;
    solid:instanceContainer </vault/resources/concepts/> .
```

This enables coarse discovery: "where do ConceptNotes live?" The `solid-pod types`
command reads this index and presents it as a routing table.

## VoID Dataset Description

`.well-known/solid` includes VoID (Vocabulary of Interlinked Datasets) triples:

```turtle
<#dataset> a void:Dataset ;
    void:class vault:ConceptNote ;
    void:entities 42 ;
    void:vocabulary <http://www.w3.org/2004/02/skos/core#> ;
    dct:conformsTo <http://pod.vardeman.me:3000/vault/ontology#SolidPodProfile> .
```

This tells agents what classes exist, how many instances, and which vocabularies
are in use -- before making any resource requests.

## PROF ResourceDescriptors

The SolidPodProfile uses W3C Profiles Vocabulary (PROF) to link to related
resources with typed roles:

```turtle
<#schemaDesc> a prof:ResourceDescriptor ;
    prof:hasRole role:schema ;
    prof:hasArtifact </vault/ontology/vault-ontology.ttl> .

<#constraintDesc> a prof:ResourceDescriptor ;
    prof:hasRole role:constraints ;
    prof:hasArtifact </vault/procedures/shapes/concept-note.ttl> .

<#guidanceDesc> a prof:ResourceDescriptor ;
    prof:hasRole role:guidance ;
    prof:hasArtifact </vault/procedures/queries/> .
```

Roles from the W3C Content Role vocabulary:
- `role:schema` -- ontology/vocabulary definitions
- `role:constraints` -- SHACL shapes for validation
- `role:guidance` -- SPARQL examples and procedural guidance
