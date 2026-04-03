# solid-agent-skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript CLI (`solid-pod`) that enables LLM agents to discover, navigate, query, and create resources on Solid Pods, with JSON-LD compact output and vault-inspired commands.

**Architecture:** Single CLI binary with subcommands. Comunica (`@comunica/query-sparql-link-traversal`) for SPARQL reads. Native `fetch` for HTTP operations, Link header parsing, and writes. `jsonld` npm package for compact JSON-LD output. Commander.js for subcommand routing.

**Tech Stack:** TypeScript, Commander.js, @comunica/query-sparql-link-traversal@0.8.0, jsonld@9.x, Node.js native fetch

**Reference Pod:** `http://pod.vardeman.me:3000/vault/` (run `cd ~/dev/git/LA3D/agents/cogitarelink-solid && make up` to start)

---

## Task 1: Project scaffold — package.json, tsconfig, CLI entry point

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/cli.ts`
- Create: `src/commands/info.ts` (stub)

**Step 1: Create package.json**

```json
{
  "name": "solid-agent-skills",
  "version": "0.1.0",
  "description": "Agent-first CLI for Solid Pod interaction",
  "type": "module",
  "bin": { "solid-pod": "./dist/cli.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@comunica/query-sparql-link-traversal": "0.8.0",
    "commander": "^13.0.0",
    "jsonld": "^9.0.0"
  },
  "overrides": {
    "@traqula/parser-sparql-1-2": "^1.0.0",
    "@traqula/algebra-sparql-1-2": "^1.0.0",
    "@traqula/rules-sparql-1-1": "^1.0.0",
    "@traqula/core": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/jsonld": "^1.5.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create CLI entry point `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { program } from 'commander'
import { info } from './commands/info.js'

program
  .name('solid-pod')
  .description('Agent-first CLI for Solid Pod interaction')
  .version('0.1.0')

program
  .command('info <url>')
  .description('GET .well-known/solid, return VoID/DCAT as JSON-LD')
  .action(info)

program.parse()
```

**Step 4: Create stub `src/commands/info.ts`**

```typescript
export async function info(url: string): Promise<void> {
  console.log(JSON.stringify({ status: 'not implemented', url }))
}
```

**Step 5: Install dependencies and verify build**

Run: `npm install && npx tsc --noEmit`
Expected: Clean compilation, no errors

**Step 6: Verify CLI runs**

Run: `npx tsx src/cli.ts info http://example.com`
Expected: `{"status":"not implemented","url":"http://example.com"}`

**Step 7: Commit**

```bash
git add package.json tsconfig.json src/cli.ts src/commands/info.ts
git commit -m "[Agent: Claude] Scaffold CLI with Commander.js entry point

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Shared @context and JSON-LD output helper

**Files:**
- Create: `src/lib/context.ts`
- Create: `src/lib/jsonld.ts`
- Create: `tests/lib/jsonld.test.ts`

**Step 1: Write test for JSON-LD compact output**

```typescript
// tests/lib/jsonld.test.ts
import { describe, it, expect } from 'vitest'
import { compactOutput } from '../src/lib/jsonld.js'

describe('compactOutput', () => {
  it('compacts expanded RDF to JSON-LD with shared context', async () => {
    const expanded = {
      '@id': 'http://pod.vardeman.me:3000/vault/',
      'http://purl.org/dc/terms/title': [{ '@value': 'Vault' }],
      '@type': ['http://www.w3.org/ns/ldp#Container']
    }
    const result = await compactOutput(expanded)
    expect(result['@context']).toBeDefined()
    expect(result['dct:title']).toBe('Vault')
    expect(result['@type']).toContain('ldp:Container')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/jsonld.test.ts`
Expected: FAIL — module not found

**Step 3: Create shared @context `src/lib/context.ts`**

```typescript
// Shared JSON-LD @context for all CLI output.
// Maps short prefixed keys to full URIs. Agents see readable JSON;
// downstream RDF tools see valid linked data.

export const SOLID_CONTEXT = {
  ldp: 'http://www.w3.org/ns/ldp#',
  dct: 'http://purl.org/dc/terms/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  prov: 'http://www.w3.org/ns/prov#',
  solid: 'http://www.w3.org/ns/solid/terms#',
  void: 'http://rdfs.org/ns/void#',
  dcat: 'http://www.w3.org/ns/dcat#',
  sh: 'http://www.w3.org/ns/shacl#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  pim: 'http://www.w3.org/ns/pim/space#',
  vault: 'http://pod.vardeman.me/vault/ontology#',
  prof: 'http://www.w3.org/ns/dx/prof/',
  role: 'http://www.w3.org/ns/dx/prof/role/',
} as const
```

**Step 4: Create JSON-LD output helper `src/lib/jsonld.ts`**

```typescript
import * as jsonld from 'jsonld'
import { SOLID_CONTEXT } from './context.js'

export async function compactOutput(doc: object): Promise<Record<string, unknown>> {
  return await jsonld.compact(doc, SOLID_CONTEXT) as Record<string, unknown>
}

export function output(doc: unknown): void {
  console.log(JSON.stringify(doc, null, 2))
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/jsonld.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/context.ts src/lib/jsonld.ts tests/lib/jsonld.test.ts
git commit -m "[Agent: Claude] Add shared JSON-LD context and compact output helper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: HTTP helper — fetch with Link header parsing

**Files:**
- Create: `src/lib/http.ts`
- Create: `tests/lib/http.test.ts`

**Step 1: Write test for Link header parsing**

```typescript
// tests/lib/http.test.ts
import { describe, it, expect } from 'vitest'
import { parseLinkHeaders } from '../src/lib/http.js'

describe('parseLinkHeaders', () => {
  it('parses describedby link', () => {
    const header = '</resource.md.meta>; rel="describedby", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
    const links = parseLinkHeaders(header)
    expect(links.describedby).toBe('/resource.md.meta')
    expect(links.type).toContain('http://www.w3.org/ns/ldp#Resource')
  })

  it('handles missing header', () => {
    const links = parseLinkHeaders(null)
    expect(links).toEqual({})
  })

  it('parses multiple type links', () => {
    const header = '<http://www.w3.org/ns/ldp#Resource>; rel="type", <http://www.w3.org/ns/ldp#Container>; rel="type"'
    const links = parseLinkHeaders(header)
    expect(links.type).toContain('http://www.w3.org/ns/ldp#Resource')
    expect(links.type).toContain('http://www.w3.org/ns/ldp#Container')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/http.test.ts`
Expected: FAIL — module not found

**Step 3: Implement HTTP helper `src/lib/http.ts`**

```typescript
export interface LinkHeaders {
  describedby?: string
  type?: string[]
  acl?: string
  constrainedBy?: string
  [key: string]: string | string[] | undefined
}

export function parseLinkHeaders(header: string | null): LinkHeaders {
  if (!header) return {}
  const links: LinkHeaders = {}
  for (const part of header.split(',')) {
    const match = part.match(/\s*<([^>]+)>\s*;\s*rel="([^"]+)"/)
    if (!match) continue
    const [, uri, rel] = match
    if (rel === 'type') {
      links.type = links.type || []
      ;(links.type as string[]).push(uri)
    } else {
      links[rel] = uri
    }
  }
  return links
}

export interface FetchResult {
  status: number
  headers: LinkHeaders
  contentType: string
  body: string
}

export async function fetchResource(url: string, accept?: string): Promise<FetchResult> {
  const headers: Record<string, string> = {}
  if (accept) headers['Accept'] = accept
  const res = await fetch(url, { headers })
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') || '',
    body: await res.text(),
  }
}

export async function putResource(url: string, body: string, contentType: string): Promise<FetchResult> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  })
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') || '',
    body: await res.text(),
  }
}

export async function patchResource(url: string, n3patch: string): Promise<FetchResult> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/n3' },
    body: n3patch,
  })
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') || '',
    body: await res.text(),
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/http.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/http.ts tests/lib/http.test.ts
git commit -m "[Agent: Claude] Add HTTP helper with Link header parsing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Comunica wrapper

**Files:**
- Create: `src/lib/comunica.ts`
- Create: `tests/lib/comunica.test.ts`

**Step 1: Write test for Comunica wrapper**

This test requires a running pod. Use vitest `describe.skipIf` for CI.

```typescript
// tests/lib/comunica.test.ts
import { describe, it, expect } from 'vitest'
import { querySparql } from '../src/lib/comunica.js'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('querySparql (integration)', () => {
  it('runs a SELECT query against the pod', async () => {
    const result = await querySparql(
      `SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 3`,
      [POD]
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('s')
  })
}, { timeout: 30_000 })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/comunica.test.ts`
Expected: FAIL — module not found

**Step 3: Implement Comunica wrapper `src/lib/comunica.ts`**

```typescript
import { QueryEngine } from '@comunica/query-sparql-link-traversal'

let engine: QueryEngine | null = null

function getEngine(): QueryEngine {
  if (!engine) engine = new QueryEngine()
  return engine
}

export interface SparqlBinding {
  [variable: string]: { type: string; value: string }
}

export async function querySparql(
  query: string,
  sources: string[],
): Promise<SparqlBinding[]> {
  const eng = getEngine()
  const stream = await eng.queryBindings(query, {
    sources: sources.map(s => ({ type: 'auto' as const, value: s })),
    lenient: true,
  })
  const bindings = await stream.toArray()
  return bindings.map(b => {
    const obj: SparqlBinding = {}
    for (const [key, term] of b) {
      obj[key.value] = { type: term.termType, value: term.value }
    }
    return obj
  })
}
```

**Step 4: Run test (with pod running)**

Run: `npx vitest run tests/lib/comunica.test.ts`
Expected: PASS (if pod is running), SKIP (if not)

**Step 5: Commit**

```bash
git add src/lib/comunica.ts tests/lib/comunica.test.ts
git commit -m "[Agent: Claude] Add Comunica SPARQL wrapper with link-traversal engine

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: `solid-pod info` command — pod discovery

**Files:**
- Modify: `src/commands/info.ts`
- Modify: `src/cli.ts` (already wired)
- Create: `tests/commands/info.test.ts`

**Step 1: Write integration test**

```typescript
// tests/commands/info.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod info', () => {
  it('returns JSON-LD with VoID/DCAT from .well-known/solid', () => {
    const out = execSync(`npx tsx src/cli.ts info ${POD}`, { encoding: 'utf8' })
    const result = JSON.parse(out)
    expect(result['@context']).toBeDefined()
    expect(result['@id']).toBeDefined()
    // Should contain void:Dataset or dcat:DataService type
    const types = [].concat(result['@type'] || [])
    expect(types.length).toBeGreaterThan(0)
  })
}, { timeout: 30_000 })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/info.test.ts`
Expected: FAIL — returns stub output

**Step 3: Implement `src/commands/info.ts`**

```typescript
import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'
import { N3 } from '../lib/rdf.js'

export async function info(url: string): Promise<void> {
  // Normalize to base URL, discover .well-known/solid
  const base = url.endsWith('/') ? url : url + '/'
  const wellKnown = new URL('.well-known/solid', base).href

  const res = await fetchResource(wellKnown, 'text/turtle')
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${wellKnown}`, status: res.status })
    process.exitCode = 1
    return
  }

  // Parse Turtle to JSON-LD via N3 -> jsonld compact
  const quads = new N3.Parser({ baseIRI: wellKnown }).parse(res.body)
  const writer = new N3.Writer({ format: 'application/n-quads' })
  quads.forEach(q => writer.addQuad(q))

  const nquads = await new Promise<string>((resolve, reject) => {
    writer.end((err, result) => err ? reject(err) : resolve(result))
  })

  const jsonld = await import('jsonld')
  const expanded = await jsonld.default.fromRDF(nquads, { format: 'application/n-quads' })
  const compacted = await compactOutput(expanded.length === 1 ? expanded[0] : expanded)

  // Add affordances from Link headers
  if (Object.keys(res.headers).length > 0) {
    (compacted as Record<string, unknown>).affordances = res.headers
  }

  output(compacted)
}
```

**Step 4: We need an N3 parser — add to lib**

Create `src/lib/rdf.ts`:

```typescript
export { default as N3 } from 'n3'
```

Add `n3` and `@types/n3` to package.json dependencies/devDependencies.

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/commands/info.test.ts`
Expected: PASS (with pod running)

**Step 6: Commit**

```bash
git add src/commands/info.ts src/lib/rdf.ts tests/commands/info.test.ts package.json
git commit -m "[Agent: Claude] Implement solid-pod info — pod discovery via .well-known/solid

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: `solid-pod read` command — resource + Link headers + .meta

**Files:**
- Create: `src/commands/read.ts`
- Modify: `src/cli.ts` (add command)
- Create: `tests/commands/read.test.ts`

**Step 1: Write integration test**

```typescript
// tests/commands/read.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod read', () => {
  it('returns content + affordances + meta for a resource', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts read ${url}`, { encoding: 'utf8' })
    const result = JSON.parse(out)
    expect(result['@id']).toBeDefined()
    expect(result.affordances).toBeDefined()
  })
}, { timeout: 30_000 })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/read.test.ts`
Expected: FAIL — command not found

**Step 3: Implement `src/commands/read.ts`**

```typescript
import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'

export async function read(url: string): Promise<void> {
  // Fetch the resource itself
  const res = await fetchResource(url)
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  const result: Record<string, unknown> = {
    '@id': url,
    'dct:format': res.contentType,
    content: res.body,
    affordances: res.headers,
  }

  // If describedby link exists, fetch .meta
  if (res.headers.describedby) {
    const metaUrl = new URL(res.headers.describedby as string, url).href
    const metaRes = await fetchResource(metaUrl, 'text/turtle')
    if (metaRes.status === 200) {
      // Parse Turtle .meta to JSON-LD
      const N3 = (await import('n3')).default
      const quads = new N3.Parser({ baseIRI: metaUrl }).parse(metaRes.body)
      const writer = new N3.Writer({ format: 'application/n-quads' })
      quads.forEach(q => writer.addQuad(q))
      const nquads = await new Promise<string>((resolve, reject) => {
        writer.end((err, r) => err ? reject(err) : resolve(r))
      })
      const jsonld = await import('jsonld')
      const expanded = await jsonld.default.fromRDF(nquads, { format: 'application/n-quads' })
      result.meta = await compactOutput(expanded.length === 1 ? expanded[0] : expanded)
    }
  }

  output(result)
}
```

**Step 4: Wire into `src/cli.ts`**

Add import and command registration for `read`.

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/commands/read.test.ts`
Expected: PASS (with pod running)

**Step 6: Commit**

```bash
git add src/commands/read.ts src/cli.ts tests/commands/read.test.ts
git commit -m "[Agent: Claude] Implement solid-pod read — resource + affordances + .meta

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: `solid-pod sparql` command — raw SPARQL escape hatch

**Files:**
- Create: `src/commands/sparql.ts`
- Modify: `src/cli.ts` (add command)
- Create: `tests/commands/sparql.test.ts`

**Step 1: Write integration test**

```typescript
// tests/commands/sparql.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod sparql', () => {
  it('executes raw SPARQL and returns JSON-LD results', () => {
    const query = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 3'
    const out = execSync(
      `npx tsx src/cli.ts sparql ${POD} "${query}"`,
      { encoding: 'utf8' }
    )
    const result = JSON.parse(out)
    expect(result.results).toBeDefined()
    expect(result.results.length).toBeGreaterThan(0)
  })
}, { timeout: 30_000 })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/sparql.test.ts`
Expected: FAIL — command not found

**Step 3: Implement `src/commands/sparql.ts`**

```typescript
import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function sparql(url: string, query: string): Promise<void> {
  try {
    const bindings = await querySparql(query, [url])
    output({
      '@context': { solid: 'http://www.w3.org/ns/solid/terms#' },
      source: url,
      query,
      results: bindings,
    })
  } catch (err) {
    output({
      error: `SPARQL query failed: ${(err as Error).message}`,
      source: url,
      query,
    })
    process.exitCode = 1
  }
}
```

**Step 4: Wire into `src/cli.ts`**

Add import and command:
```typescript
program
  .command('sparql <url> <query>')
  .description('Execute raw SPARQL via Comunica link-traversal')
  .action(sparql)
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/commands/sparql.test.ts`
Expected: PASS (with pod running)

**Step 6: Commit**

```bash
git add src/commands/sparql.ts src/cli.ts tests/commands/sparql.test.ts
git commit -m "[Agent: Claude] Implement solid-pod sparql — raw SPARQL escape hatch

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: `solid-pod shapes` command — SHACL + sh:agentInstruction

**Files:**
- Create: `src/commands/shapes.ts`
- Modify: `src/cli.ts` (add command)
- Create: `tests/commands/shapes.test.ts`

**Step 1: Write integration test**

```typescript
// tests/commands/shapes.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod shapes', () => {
  it('lists SHACL shapes with agentInstruction', () => {
    const url = `${POD}procedures/shapes/`
    const out = execSync(`npx tsx src/cli.ts shapes ${url}`, { encoding: 'utf8' })
    const result = JSON.parse(out)
    expect(result.shapes).toBeDefined()
    expect(result.shapes.length).toBeGreaterThan(0)
    // Should include sh:agentInstruction text
    const shape = result.shapes[0]
    expect(shape['sh:agentInstruction'] || shape.agentInstruction).toBeDefined()
  })
}, { timeout: 30_000 })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/shapes.test.ts`
Expected: FAIL — command not found

**Step 3: Implement `src/commands/shapes.ts`**

```typescript
import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'

export async function shapes(url: string): Promise<void> {
  // Fetch the shapes container
  const res = await fetchResource(url, 'text/turtle')
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  // Parse container listing to find .ttl resources
  const N3 = (await import('n3')).default
  const parser = new N3.Parser({ baseIRI: url })
  const quads = parser.parse(res.body)

  const ldpContains = 'http://www.w3.org/ns/ldp#contains'
  const shapeUrls = quads
    .filter(q => q.predicate.value === ldpContains)
    .map(q => q.object.value)
    .filter(u => u.endsWith('.ttl'))

  // Fetch each shape, extract key fields
  const shapeDocs = []
  for (const shapeUrl of shapeUrls) {
    const shapeRes = await fetchResource(shapeUrl, 'text/turtle')
    if (shapeRes.status !== 200) continue
    const shapeQuads = new N3.Parser({ baseIRI: shapeUrl }).parse(shapeRes.body)
    const writer = new N3.Writer({ format: 'application/n-quads' })
    shapeQuads.forEach(q => writer.addQuad(q))
    const nquads = await new Promise<string>((resolve, reject) => {
      writer.end((err, r) => err ? reject(err) : resolve(r))
    })
    const jsonld = await import('jsonld')
    const expanded = await jsonld.default.fromRDF(nquads, { format: 'application/n-quads' })
    const compacted = await compactOutput(expanded.length === 1 ? expanded[0] : expanded)
    shapeDocs.push(compacted)
  }

  output({
    '@context': { sh: 'http://www.w3.org/ns/shacl#' },
    source: url,
    shapes: shapeDocs,
  })
}
```

**Step 4: Wire into `src/cli.ts`**

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/commands/shapes.test.ts`
Expected: PASS (with pod running)

**Step 6: Commit**

```bash
git add src/commands/shapes.ts src/cli.ts tests/commands/shapes.test.ts
git commit -m "[Agent: Claude] Implement solid-pod shapes — SHACL listing with sh:agentInstruction

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: First skill — pod-shared

**Files:**
- Create: `skills/pod-shared/SKILL.md`
- Create: `skills/pod-shared/references/solid-patterns.md`

**Step 1: Create `skills/pod-shared/SKILL.md`**

This skill provides the shared context that all pod skills need. It follows
the `gws-shared` pattern. Content should describe:

- How to connect to a pod (URL, no auth for dev)
- The four-layer self-description model
- What affordances (Link headers) mean and how to follow them
- JSON-LD output format and how to read it
- Available CLI commands and when to use each

Refer to `docs/plans/2026-04-03-project-structure-design.md` for the command
surface and `../cogitarelink-solid/.claude/rules/solid-patterns.md` for the
Solid protocol patterns.

**Step 2: Create `skills/pod-shared/references/solid-patterns.md`**

Copy and adapt the content from `.claude/rules/solid-patterns.md` — the
pod discovery path, LDP operations, .meta sidecar pattern, N3 Patch format,
and SHACL 1.2 agent guidance. This is the progressive-disclosure reference
material loaded only when the agent needs protocol details.

**Step 3: Commit**

```bash
git add skills/pod-shared/
git commit -m "[Agent: Claude] Add pod-shared skill — cross-cutting Solid Pod context

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Second skill — pod-discover

**Files:**
- Create: `skills/pod-discover/SKILL.md`

**Step 1: Create `skills/pod-discover/SKILL.md`**

This skill teaches the workflow for arriving at an unknown pod:

1. Run `solid-pod info <pod-url>` to get VoID/DCAT
2. Read the `dct:conformsTo` to understand what profiles the pod supports
3. Read `void:vocabulary` to know what vocabularies are in use
4. Follow the profile link to get PROF ResourceDescriptors
5. Use `solid-pod shapes <pod-url>/procedures/shapes/` to read SHACL shapes
6. Read `sh:agentInstruction` to understand query patterns

PREREQUISITE line: "Read `../pod-shared/SKILL.md` first."

**Step 2: Commit**

```bash
git add skills/pod-discover/
git commit -m "[Agent: Claude] Add pod-discover skill — pod arrival workflow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Remaining navigation commands — links, types, backlinks

**Files:**
- Create: `src/commands/links.ts`
- Create: `src/commands/types.ts`
- Create: `src/commands/backlinks.ts`
- Modify: `src/cli.ts`
- Create: `tests/commands/links.test.ts`

Each command follows the same pattern:
- `links <url>`: Fetch `.meta`, parse outgoing references, output as JSON-LD
- `types <url>`: SPARQL `SELECT DISTINCT ?type (COUNT(*) AS ?count) WHERE { ?s dct:type ?type }` 
- `backlinks <url>`: SPARQL `SELECT ?s ?p WHERE { ?s ?p <target> }`

Implementation follows the same TDD pattern as Tasks 5-8. Each command is
thin: fetch or query, parse, compact, output.

**Step 1-3: Write failing tests for each**

**Step 4-6: Implement each command (one at a time)**

**Step 7: Wire all into cli.ts**

**Step 8: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 9: Commit**

```bash
git add src/commands/links.ts src/commands/types.ts src/commands/backlinks.ts src/cli.ts tests/commands/
git commit -m "[Agent: Claude] Implement links, types, backlinks navigation commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Write commands — create and patch

**Files:**
- Create: `src/commands/create.ts`
- Create: `src/commands/patch.ts`
- Modify: `src/cli.ts`
- Create: `tests/commands/create.test.ts`

**Step 1: Write test for create**

```typescript
// Test: create a resource and verify it exists
// Uses a unique slug to avoid collisions
// Cleans up after itself
```

**Step 2: Implement create**

`solid-pod create <container-url> --slug <name> --content <file-or-stdin> [--shape <shape-url>]`

1. If `--shape` provided, fetch shape, validate content against it
2. PUT the resource content
3. If `.meta` needed, PATCH the `.meta` with N3 Patch

**Step 3: Implement patch**

`solid-pod patch <meta-url> --insert <n3-triples>`

Thin wrapper around N3 Patch format.

**Step 4: Wire into cli.ts, run tests**

**Step 5: Commit**

```bash
git add src/commands/create.ts src/commands/patch.ts src/cli.ts tests/commands/create.test.ts
git commit -m "[Agent: Claude] Implement create and patch write commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Remaining skills — pod-browse, pod-query, pod-create

**Files:**
- Create: `skills/pod-browse/SKILL.md`
- Create: `skills/pod-query/SKILL.md`
- Create: `skills/pod-create/SKILL.md`

Each skill teaches a multi-step workflow using the CLI commands.
Follow the agentskills.io spec format (YAML frontmatter with
`name` and `description`, markdown body).

**Step 1: Write each SKILL.md**

**Step 2: Commit**

```bash
git add skills/
git commit -m "[Agent: Claude] Add pod-browse, pod-query, pod-create skills

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Component | Depends on |
|------|-----------|-----------|
| 1 | Project scaffold | — |
| 2 | JSON-LD output helper | 1 |
| 3 | HTTP + Link header parsing | 1 |
| 4 | Comunica wrapper | 1 |
| 5 | `info` command | 2, 3 |
| 6 | `read` command | 2, 3 |
| 7 | `sparql` command | 2, 4 |
| 8 | `shapes` command | 2, 3 |
| 9 | pod-shared skill | 5-8 (for command reference) |
| 10 | pod-discover skill | 9 |
| 11 | links, types, backlinks | 2, 3, 4 |
| 12 | create, patch | 2, 3 |
| 13 | remaining skills | 9-12 |
