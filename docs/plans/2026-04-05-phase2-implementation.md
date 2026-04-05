# Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CLI works end-to-end against the live reference pod — all 11 commands build, pass tests, and an agent can discover → browse → query → search → create a conformant resource.

**Architecture:** TypeScript CLI (Commander.js) with 11 commands outputting JSON-LD. Lib layer handles HTTP/Link headers, Comunica SPARQL, and `.meta` auto-discovery. Integration tests run against `pod.vardeman.me:3000/vault/` gated by `SOLID_POD_URL` env var. OpenProse agentic tests verify agent behavior.

**Tech Stack:** TypeScript, Commander.js 13, Comunica link-traversal 0.8.0, N3.js, jsonld, Vitest

---

## Task 1: Install Dependencies and Compile

**Files:**
- Existing: `package.json`
- Existing: `tsconfig.json`
- Output: `dist/` (gitignored)

**Step 1: Install npm dependencies**

Run: `npm install`
Expected: Clean install, `node_modules/` created, no errors

**Step 2: Compile TypeScript**

Run: `npm run build`
Expected: Clean compile to `dist/`, no type errors

If there are compile errors, fix them in the source files. Common issues:
- Missing `.js` extensions on imports (required by NodeNext resolution)
- N3 default import (`import N3 from 'n3'`) may need `import * as N3 from 'n3'` depending on version

**Step 3: Verify CLI runs**

Run: `node dist/cli.js --help`
Expected: Shows `solid-pod` help with all 9 commands listed

**Step 4: Commit if any fixes were needed**

```bash
git add src/
git commit -m "[Agent: Claude] Fix compile errors for Phase 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Run Unit Tests

**Files:**
- Test: `tests/lib/http.test.ts` (parseLinkHeaders — 6 tests, no network)
- Test: `tests/lib/jsonld.test.ts` (compactOutput — 1 test, no network)

**Step 1: Run unit tests only (no pod needed)**

Run: `npx vitest run tests/lib/http.test.ts tests/lib/jsonld.test.ts`
Expected: All 7 tests pass

**Step 2: Fix any failures**

The `parseLinkHeaders` tests and `compactOutput` test should pass without changes.
If jsonld import fails, check that the `@types/jsonld` version matches `jsonld@^9.0.0`.

**Step 3: Commit if fixes were needed**

```bash
git add tests/ src/
git commit -m "[Agent: Claude] Fix unit test failures

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Validate `info` Command Against Live Pod

**Files:**
- Source: `src/commands/info.ts`
- Test: `tests/commands/info.test.ts`

**Step 1: Run info command manually**

Run: `npx tsx src/cli.ts info http://pod.vardeman.me:3000/vault/`

Expected output (JSON-LD): an object with `@context`, `@id` pointing to the vault,
`@type` including `pim:Storage` and `void:Dataset`, and `void:vocabulary` listing
SKOS, DCT, PROV, and vault ontology. The pod returns:
```turtle
<../> a pim:Storage, void:Dataset, dcat:DataService;
    dct:conformsTo fabric:CoreProfile, fabric:SolidPodProfile;
    void:vocabulary skos:, dct:, prov:, vault:;
    void:feature fabric:LDPBrowse.
```

**Step 2: If the command fails, diagnose and fix**

Likely issues:
- N3 Parser baseIRI resolution for `.well-known/solid` relative to pod root
- jsonld compaction with the SOLID_CONTEXT prefixes
- The `@id` uses `<../>` (relative) — N3 Parser should resolve this against baseIRI

**Step 3: Run the info integration test**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/info.test.ts`
Expected: 3 tests pass

**Step 4: Commit if fixes were needed**

```bash
git add src/commands/info.ts
git commit -m "[Agent: Claude] Fix info command for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Validate `read` Command Against Live Pod

**Files:**
- Source: `src/commands/read.ts`
- Test: `tests/commands/read.test.ts`

**Step 1: Run read against a container**

Run: `npx tsx src/cli.ts read http://pod.vardeman.me:3000/vault/resources/concepts/`

Expected: JSON with `@id`, `dct:format` = `text/turtle`, `content` = Turtle listing,
`affordances` with `describedby` = `.meta` URL, and `meta` with compacted JSON-LD from
the container's `.meta` sidecar.

The live pod returns these Link headers on `/vault/resources/concepts/`:
```
Link: <http://pod.vardeman.me:3000/vault/resources/concepts/.meta>; rel="describedby"
Link: <http://www.w3.org/ns/ldp#Container>; rel="type"
```

**Step 2: Run read against a specific resource**

Run: `npx tsx src/cli.ts read http://pod.vardeman.me:3000/vault/resources/concepts/context-graphs.md`

Expected: Markdown content, affordances, and `.meta` if describedby present.

**Step 3: Run the read integration test**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/read.test.ts`
Expected: 3 tests pass

**Step 4: Commit if fixes were needed**

```bash
git add src/commands/read.ts
git commit -m "[Agent: Claude] Fix read command for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Validate `sparql` Command Against Live Pod

**Files:**
- Source: `src/commands/sparql.ts`
- Source: `src/lib/comunica.ts`
- Source: `src/lib/http.ts` (discoverMetaSources)
- Test: `tests/commands/sparql.test.ts`
- Test: `tests/lib/comunica.test.ts`

**Step 1: Run sparql against the pod root**

Run: `npx tsx src/cli.ts sparql "http://pod.vardeman.me:3000/vault/" "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5"`

Expected: JSON with `source`, `query`, `metaSources` count, and `results` array.
Comunica should traverse LDP containers. May be slow (30s+).

**Step 2: Run sparql with auto .meta discovery on a container**

Run: `npx tsx src/cli.ts sparql "http://pod.vardeman.me:3000/vault/resources/concepts/" "SELECT ?s ?label WHERE { ?s <http://www.w3.org/2004/02/skos/core#prefLabel> ?label } LIMIT 5"`

Expected: Results with concept labels from `.meta` sidecars. `metaSources` count > 0.

**Step 3: Run integration tests**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/sparql.test.ts tests/lib/comunica.test.ts`
Expected: All tests pass (may need increased timeouts for Comunica)

**Step 4: Commit if fixes were needed**

```bash
git add src/commands/sparql.ts src/lib/comunica.ts src/lib/http.ts
git commit -m "[Agent: Claude] Fix sparql command for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Validate `shapes` Command Against Live Pod

**Files:**
- Source: `src/commands/shapes.ts`
- Test: `tests/commands/shapes.test.ts`

**Step 1: Run shapes against the shapes container**

Run: `npx tsx src/cli.ts shapes http://pod.vardeman.me:3000/vault/procedures/shapes/`

Expected: JSON with `shapes` array containing at least `concept-note.ttl`.
Each shape doc should include `sh:agentInstruction` text.

**Step 2: Run integration test**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/shapes.test.ts`
Expected: 2 tests pass

**Step 3: Commit if fixes were needed**

```bash
git add src/commands/shapes.ts
git commit -m "[Agent: Claude] Fix shapes command for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Validate Navigation Commands (`links`, `types`, `backlinks`)

**Files:**
- Source: `src/commands/links.ts`, `src/commands/types.ts`, `src/commands/backlinks.ts`
- Test: `tests/commands/links.test.ts`, `tests/commands/types.test.ts`, `tests/commands/backlinks.test.ts`

**Step 1: Run links**

Run: `npx tsx src/cli.ts links http://pod.vardeman.me:3000/vault/resources/concepts/`

Expected: JSON with `links` array of `{predicate, target}` pairs from the container `.meta`.
Should include predicates like `dct:type`, `dct:description`, `sh:agentInstruction`.

**Step 2: Run types**

Run: `npx tsx src/cli.ts types http://pod.vardeman.me:3000/vault/resources/concepts/`

Expected: JSON with `types` array showing `{type, count}`. Should include
`ldp:Container`, `ldp:Resource`, and `skos:Collection`.

**Step 3: Run backlinks**

Run: `npx tsx src/cli.ts backlinks http://pod.vardeman.me:3000/vault/resources/concepts/ --source http://pod.vardeman.me:3000/vault/`

Expected: JSON with `backlinks` array. The concepts container should be referenced
from the pod root or type index.

**Step 4: Run all three integration tests**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/links.test.ts tests/commands/types.test.ts tests/commands/backlinks.test.ts`
Expected: All tests pass

**Step 5: Commit if fixes were needed**

```bash
git add src/commands/links.ts src/commands/types.ts src/commands/backlinks.ts
git commit -m "[Agent: Claude] Fix navigation commands for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Validate Write Commands (`create`, `patch`)

**Files:**
- Source: `src/commands/create.ts`, `src/commands/patch.ts`
- Test: `tests/commands/create.test.ts`, `tests/commands/patch.test.ts`

**Step 1: Run create**

Run: `npx tsx src/cli.ts create http://pod.vardeman.me:3000/vault/resources/concepts/ --slug test-plan-validation.md --body "# Test Note"`

Expected: JSON with `status: "created"`, `@id` containing the slug, `metaPatched: false`.

**Step 2: Run create with --meta**

Run: `npx tsx src/cli.ts create http://pod.vardeman.me:3000/vault/resources/concepts/ --slug test-meta-validation.md --body "# Meta Test" --meta '<> <http://purl.org/dc/terms/title> "Test" .'`

Expected: JSON with `metaPatched: true`.

**Step 3: Clean up test resources**

Run:
```bash
curl -X DELETE http://pod.vardeman.me:3000/vault/resources/concepts/test-plan-validation.md
curl -X DELETE http://pod.vardeman.me:3000/vault/resources/concepts/test-meta-validation.md
```

**Step 4: Run patch test (creates its own fixture)**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/create.test.ts tests/commands/patch.test.ts`
Expected: All tests pass. The tests create and delete their own resources.

**Step 5: Commit if fixes were needed**

```bash
git add src/commands/create.ts src/commands/patch.ts
git commit -m "[Agent: Claude] Fix write commands for live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Implement `search` Command

**Files:**
- Create: `src/commands/search.ts`
- Modify: `src/cli.ts` (add search command registration)
- Test: `tests/commands/search.test.ts`

**Step 1: Write the failing test**

Create `tests/commands/search.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod search', { timeout: 60_000 }, () => {
  it('finds resources matching search terms', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts search "${url}" "context graph"`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result.source).toBe(url)
    expect(result.terms).toBe('context graph')
    expect(result.results).toBeDefined()
    expect(Array.isArray(result.results)).toBe(true)
    expect(result.results.length).toBeGreaterThan(0)
  })

  it('returns empty results for no match', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts search "${url}" "xyznonexistent123"`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result.results).toEqual([])
  })

  it('includes method field indicating search strategy', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts search "${url}" "knowledge"`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result.method).toMatch(/oslc|sparql/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/search.test.ts`
Expected: FAIL — `search` command doesn't exist

**Step 3: Write the search command**

Create `src/commands/search.ts`:
```typescript
import { fetchResource, discoverMetaSources } from '../lib/http.js'
import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function search(
  url: string,
  terms: string,
  options: { source?: string; noFallback?: boolean } = {},
): Promise<void> {
  const containerUrl = url.endsWith('/') ? url : url + '/'
  const source = options.source ?? containerUrl

  // Try OSLC Query first
  if (!options.noFallback) {
    const oslcUrl = `${containerUrl}?oslc.searchTerms=${encodeURIComponent(terms)}`
    const res = await fetchResource(oslcUrl, 'text/turtle')
    if (res.status === 200 && !res.body.includes('RouteHandler')) {
      // OSLC supported — parse results
      // For now, CSS doesn't support OSLC, so this path is future-proofing
      output({ source: containerUrl, terms, method: 'oslc', results: [] })
      return
    }
  }

  // Fallback: SPARQL REGEX over .meta triples
  try {
    const metaSources = await discoverMetaSources(containerUrl)
    if (metaSources.length === 0) {
      output({ source: containerUrl, terms, method: 'sparql', results: [] })
      return
    }

    // Escape regex special chars in search terms
    const escaped = terms.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const query = `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX dct: <http://purl.org/dc/terms/>
      SELECT DISTINCT ?s ?label ?p ?match WHERE {
        ?s ?p ?match .
        FILTER(REGEX(STR(?match), "${escaped}", "i"))
        OPTIONAL { ?s skos:prefLabel ?prefLabel }
        OPTIONAL { ?s rdfs:label ?rdfsLabel }
        OPTIONAL { ?s dct:title ?dctTitle }
        BIND(COALESCE(?prefLabel, ?rdfsLabel, ?dctTitle, STR(?s)) AS ?label)
      }
    `
    const bindings = await querySparql(query, metaSources)
    const results = bindings.map(b => ({
      resource: b.s.value,
      label: b.label.value,
      matchedPredicate: b.p.value,
      matchedValue: b.match.value,
    }))

    output({ source: containerUrl, terms, method: 'sparql', metaSources: metaSources.length, results })
  } catch (err) {
    output({
      error: `Search failed: ${(err as Error).message}`,
      source: containerUrl,
      terms,
    })
    process.exitCode = 1
  }
}
```

**Step 4: Register command in cli.ts**

Add to `src/cli.ts` after the patch import:
```typescript
import { search } from './commands/search.js'
```

Add after the patch command registration:
```typescript
program
  .command('search <url> <terms>')
  .description('Search container resources by text (OSLC Query with SPARQL fallback)')
  .option('--source <url>', 'Explicit source URL to search')
  .option('--no-fallback', 'Skip OSLC attempt, go straight to SPARQL')
  .action(search)
```

**Step 5: Run test to verify it passes**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/search.test.ts`
Expected: 3 tests pass

**Step 6: Commit**

```bash
git add src/commands/search.ts src/cli.ts tests/commands/search.test.ts
git commit -m "[Agent: Claude] Add search command with OSLC-first SPARQL fallback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Implement `properties` Command

**Files:**
- Create: `src/commands/properties.ts`
- Modify: `src/cli.ts` (add properties command registration)
- Test: `tests/commands/properties.test.ts`

**Step 1: Write the failing test**

Create `tests/commands/properties.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod properties', { timeout: 60_000 }, () => {
  it('returns predicate usage counts for a container', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts properties ${url}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result.source).toBe(url)
    expect(result.properties).toBeDefined()
    expect(Array.isArray(result.properties)).toBe(true)
    expect(result.properties.length).toBeGreaterThan(0)
  })

  it('each property has predicate and count', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts properties ${url}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    for (const prop of result.properties) {
      expect(prop.predicate).toBeDefined()
      expect(typeof prop.predicate).toBe('string')
      expect(prop.predicate).toMatch(/^http/)
      expect(prop.count).toBeDefined()
      expect(typeof prop.count).toBe('number')
      expect(prop.count).toBeGreaterThan(0)
    }
  })

  it('includes common predicates (skos:prefLabel, dct:subject)', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts properties ${url}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    const predicates = result.properties.map((p: { predicate: string }) => p.predicate)
    // The concepts container .meta files should have these predicates
    expect(predicates.some((p: string) => p.includes('prefLabel') || p.includes('label'))).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/properties.test.ts`
Expected: FAIL — `properties` command doesn't exist

**Step 3: Write the properties command**

Create `src/commands/properties.ts`:
```typescript
import { discoverMetaSources } from '../lib/http.js'
import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function properties(
  url: string,
  options: { source?: string } = {},
): Promise<void> {
  const containerUrl = url.endsWith('/') ? url : url + '/'

  try {
    const sources = options.source
      ? [options.source]
      : await discoverMetaSources(containerUrl)

    if (sources.length === 0) {
      output({ source: containerUrl, properties: [] })
      return
    }

    const query = `
      SELECT ?p (COUNT(?s) AS ?count)
      WHERE { ?s ?p ?o }
      GROUP BY ?p
      ORDER BY DESC(?count)
    `
    const bindings = await querySparql(query, sources)
    const properties = bindings.map(b => ({
      predicate: b.p.value,
      count: parseInt(b.count.value, 10),
    }))

    output({ source: containerUrl, metaSources: sources.length, properties })
  } catch (err) {
    output({
      error: `Properties query failed: ${(err as Error).message}`,
      source: containerUrl,
    })
    process.exitCode = 1
  }
}
```

**Step 4: Register command in cli.ts**

Add to `src/cli.ts` after the search import:
```typescript
import { properties } from './commands/properties.js'
```

Add after the search command registration:
```typescript
program
  .command('properties <url>')
  .description('Show predicate usage statistics from container .meta files')
  .option('--source <url>', 'Explicit source URL')
  .action(properties)
```

**Step 5: Run test to verify it passes**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/commands/properties.test.ts`
Expected: 3 tests pass

**Step 6: Commit**

```bash
git add src/commands/properties.ts src/cli.ts tests/commands/properties.test.ts
git commit -m "[Agent: Claude] Add properties command for vocabulary usage stats

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: End-to-End Integration Test

**Files:**
- Create: `tests/e2e/workflow.test.ts`

**Step 1: Write the end-to-end test**

Create `tests/e2e/workflow.test.ts`:
```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

function run(cmd: string): Record<string, unknown> {
  const out = execSync(`npx tsx src/cli.ts ${cmd}`, {
    encoding: 'utf8',
    cwd: process.cwd(),
    timeout: 60_000,
  })
  return JSON.parse(out)
}

describe.skipIf(!podAvailable)('end-to-end: discover → browse → query → create', {
  timeout: 120_000,
}, () => {
  const slug = `e2e-test-${Date.now()}.md`
  const containerUrl = `${POD}resources/concepts/`

  afterAll(async () => {
    try { await fetch(`${containerUrl}${slug}`, { method: 'DELETE' }) } catch {}
  })

  it('Step 1: discover pod via info', () => {
    const result = run(`info ${POD}`)
    expect(result['@context']).toBeDefined()
    // Pod should declare vocabularies
    const json = JSON.stringify(result)
    expect(json).toContain('vocabulary')
  })

  it('Step 2: find shapes with sh:agentInstruction', () => {
    const result = run(`shapes ${POD}procedures/shapes/`)
    expect(result.shapes).toBeDefined()
    const json = JSON.stringify(result)
    expect(json).toContain('agentInstruction')
  })

  it('Step 3: browse concepts container', () => {
    const result = run(`read ${containerUrl}`)
    expect(result['@id']).toBe(containerUrl)
    expect(result.content).toBeDefined()
    // Container should list resources
    expect(result.content as string).toContain('ldp:contains')
  })

  it('Step 4: query .meta for concept labels', () => {
    const query = 'SELECT ?s ?label WHERE { ?s <http://www.w3.org/2004/02/skos/core#prefLabel> ?label } LIMIT 3'
    const result = run(`sparql "${containerUrl}" "${query}"`)
    expect(result.results).toBeDefined()
    expect((result.results as unknown[]).length).toBeGreaterThan(0)
  })

  it('Step 5: search for a concept', () => {
    const result = run(`search "${containerUrl}" "knowledge"`)
    expect(result.results).toBeDefined()
    expect((result.results as unknown[]).length).toBeGreaterThan(0)
  })

  it('Step 6: create a conformant resource', () => {
    const meta = `<> <http://www.w3.org/2004/02/skos/core#prefLabel> "E2E Test Concept" . <> <http://purl.org/dc/terms/subject> "test" .`
    const result = run(
      `create ${containerUrl} --slug "${slug}" --body "# E2E Test Concept\\n\\nCreated by end-to-end test." --meta '${meta}'`,
    )
    expect(result.status).toBe('created')
    expect(result.metaPatched).toBe(true)
  })

  it('Step 7: verify created resource is readable', () => {
    const result = run(`read ${containerUrl}${slug}`)
    expect(result['@id']).toBe(`${containerUrl}${slug}`)
    expect(result.content).toContain('E2E Test Concept')
  })
})
```

**Step 2: Run the e2e test**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run tests/e2e/workflow.test.ts`
Expected: All 7 steps pass

**Step 3: Commit**

```bash
git add tests/e2e/workflow.test.ts
git commit -m "[Agent: Claude] Add end-to-end workflow integration test

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Update Skills for Command Changes

**Files:**
- Modify: `skills/pod-discover/SKILL.md` (if info command output changed)
- Modify: `skills/pod-browse/SKILL.md` (if read/links output changed)
- Modify: `skills/pod-query/SKILL.md` (add search command reference)
- Modify: `skills/pod-create/SKILL.md` (if create command interface changed)

**Step 1: Read each skill file and compare against actual command output**

Run each command, compare the output format against what the skill documents describe.
Focus on:
- Command names and flags matching
- Output JSON-LD structure matching skill expectations
- New `search` and `properties` commands documented in appropriate skills

**Step 2: Update pod-query skill to include search**

Add a section to `skills/pod-query/SKILL.md` describing the search command:
- When to use search vs sparql
- Search is for text matching; sparql is for structured queries
- Search tries OSLC first, falls back to SPARQL REGEX

**Step 3: Add properties to pod-browse skill**

The `properties` command helps agents understand what vocabulary a container uses —
natural fit in the browse workflow.

**Step 4: Commit**

```bash
git add skills/
git commit -m "[Agent: Claude] Update skills for search + properties commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Write OpenProse Agentic Test Program

**Files:**
- Create: `tests/agentic/pod-navigator.prose`
- Create: `tests/agentic/tasks.json`

**Step 1: Define test tasks**

Create `tests/agentic/tasks.json`:
```json
[
  {
    "id": "discover-pod",
    "type": "discovery",
    "instruction": "You have been given a pod URL. Discover what this pod contains, what vocabularies it uses, and what shapes constrain its resources.",
    "pod_url": "http://pod.vardeman.me:3000/vault/",
    "expected_commands": ["info", "shapes"],
    "success_criteria": "Agent identifies VoID vocabularies (SKOS, DCT, PROV) and finds at least one SHACL shape with sh:agentInstruction"
  },
  {
    "id": "find-concepts",
    "type": "navigation",
    "instruction": "Find all concept notes in the pod and list their labels.",
    "pod_url": "http://pod.vardeman.me:3000/vault/",
    "expected_commands": ["read", "sparql"],
    "success_criteria": "Agent navigates to concepts container and retrieves labels via SPARQL using the predicate from sh:agentInstruction"
  },
  {
    "id": "search-topic",
    "type": "search",
    "instruction": "Find resources related to 'knowledge graphs' in the concepts container.",
    "pod_url": "http://pod.vardeman.me:3000/vault/",
    "expected_commands": ["search"],
    "success_criteria": "Agent finds at least one matching resource"
  },
  {
    "id": "create-conformant",
    "type": "creation",
    "instruction": "Create a new concept note about 'Agent Testing Patterns' that conforms to the pod's concept-note SHACL shape. Include appropriate metadata.",
    "pod_url": "http://pod.vardeman.me:3000/vault/",
    "expected_commands": ["shapes", "create"],
    "success_criteria": "Agent reads the shape first, then creates a resource with metadata matching shape constraints (skos:prefLabel, dct:subject at minimum)"
  },
  {
    "id": "find-connections",
    "type": "navigation",
    "instruction": "Find what resources are connected to the 'context-graphs' concept note.",
    "pod_url": "http://pod.vardeman.me:3000/vault/",
    "expected_commands": ["links", "backlinks"],
    "success_criteria": "Agent uses links to find outgoing references and backlinks to find incoming references"
  }
]
```

**Step 2: Write the OpenProse program**

Create `tests/agentic/pod-navigator.prose`:
```
# Pod Navigator — Agentic Test for Solid Pod CLI
# Run with: prose run tests/agentic/pod-navigator.prose
#
# An agent arrives at an unknown pod and must complete tasks
# using only the solid-pod CLI tools and pod self-description.
# A judge evaluates whether the agent followed affordances.

agent navigator:
  model: opus
  prompt: |
    You are a Solid Pod agent. You interact with pods using the solid-pod CLI.

    Available commands:
    - solid-pod info <url> — discover pod via .well-known/solid
    - solid-pod read <url> — fetch resource with .meta sidecar
    - solid-pod sparql <url> <query> — SPARQL over pod data
    - solid-pod shapes <url> — list SHACL shapes with agent guidance
    - solid-pod links <url> — outgoing references from .meta
    - solid-pod types <url> — rdf:type counts
    - solid-pod backlinks <url> — reverse references
    - solid-pod search <url> <terms> — text search
    - solid-pod properties <url> — predicate usage stats
    - solid-pod create <url> --slug <name> --body <text> --meta <triples>
    - solid-pod patch <url> --insert <triples>

    All commands output JSON-LD. Parse the output to plan your next step.

    IMPORTANT: You must discover the pod's structure from its metadata.
    Do NOT assume you know the container layout, predicates, or shapes.
    Follow affordances: Link headers, sh:agentInstruction, Type Index.

    Working directory: ~/dev/git/LA3D/agents/solid-agent-skills/
    Run commands with: npx tsx src/cli.ts <command> <args>

agent judge:
  model: opus
  prompt: |
    You are a judge evaluating whether a Solid Pod agent correctly
    followed the pod's self-description protocol.

    Key criteria:
    1. DISCOVERY: Did the agent start with `info` to discover the pod?
    2. AFFORDANCES: Did the agent follow Link headers, sh:agentInstruction,
       and Type Index rather than hard-coding paths?
    3. SHAPE COMPLIANCE: When creating resources, did the agent read the
       SHACL shape first and use it to determine required metadata?
    4. EFFICIENCY: Did the agent use appropriate commands (not brute-force)?

    Score each criterion: PASS / PARTIAL / FAIL
    Provide a brief justification for each score.

# Run each test task

for task in tasks:
  session "Execute task"
    agent: navigator
    prompt: |
      Complete this task on the Solid Pod:

      {task.instruction}

      Pod URL: {task.pod_url}

      Run the CLI commands needed to accomplish this task.
      Show each command you run and its output.
      Explain your reasoning at each step.

  session "Evaluate task"
    agent: judge
    prompt: |
      Evaluate the navigator's performance on this task:

      Task: {task.instruction}
      Type: {task.type}
      Success criteria: {task.success_criteria}
      Expected commands: {task.expected_commands}

      Navigator's trace:
      {previous_session_output}

      Score:
      - DISCOVERY: [PASS/PARTIAL/FAIL] — justification
      - AFFORDANCES: [PASS/PARTIAL/FAIL] — justification
      - SHAPE COMPLIANCE: [PASS/PARTIAL/FAIL] — justification
      - EFFICIENCY: [PASS/PARTIAL/FAIL] — justification

      Overall: [PASS/PARTIAL/FAIL]
```

**Step 3: Commit**

```bash
git add tests/agentic/
git commit -m "[Agent: Claude] Add OpenProse agentic test program and tasks

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Run Full Test Suite and Final Validation

**Step 1: Run all unit tests**

Run: `npx vitest run tests/lib/`
Expected: All pass

**Step 2: Run all integration tests**

Run: `SOLID_POD_URL=http://pod.vardeman.me:3000/vault/ npx vitest run`
Expected: All pass (unit + integration + e2e)

**Step 3: Run the OpenProse agentic test**

Run: `prose run tests/agentic/pod-navigator.prose`
Expected: Navigator completes all 5 tasks. Judge scores mostly PASS.

**Step 4: Update CLAUDE.md if needed**

Add `search` and `properties` to the skill candidates table if not already there.

**Step 5: Final commit**

```bash
git add .
git commit -m "[Agent: Claude] Phase 2 complete: CLI validated end-to-end against live pod

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
