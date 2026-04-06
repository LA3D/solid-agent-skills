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
    expect(result['@type']).toBeDefined()
    const json = JSON.stringify(result)
    expect(json).toContain('void')
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
    expect(result.content as string).toContain('ldp:')
  })

  it('Step 4: query .meta for concept labels', () => {
    const query = 'SELECT ?s ?label WHERE { ?s <http://www.w3.org/2004/02/skos/core#prefLabel> ?label } LIMIT 3'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${containerUrl}" "${query}"`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 120_000 },
    )
    const result = JSON.parse(out) as Record<string, unknown>
    expect(result.results).toBeDefined()
    expect((result.results as unknown[]).length).toBeGreaterThan(0)
  })

  it('Step 5: search for a concept', () => {
    const result = run(`search "${containerUrl}" "knowledge"`)
    expect(result.results).toBeDefined()
    expect((result.results as unknown[]).length).toBeGreaterThan(0)
  })

  it('Step 6: create a conformant resource', () => {
    // Pipe body via stdin, pass meta via JSON.stringify to handle quotes safely
    const body = '# E2E Test Concept\n\nCreated by end-to-end test.'
    const meta = '<> <http://www.w3.org/2004/02/skos/core#prefLabel> "E2E Test Concept" .'
    const out = execSync(
      `echo ${JSON.stringify(body)} | npx tsx src/cli.ts create ${containerUrl} --slug ${slug} --meta ${JSON.stringify(meta)}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 30_000 },
    )
    const result = JSON.parse(out) as Record<string, unknown>
    expect(result.status).toBe('created')
    expect(result.metaPatched).toBe(true)
  })

  it('Step 7: verify created resource is readable', () => {
    const result = run(`read ${containerUrl}${slug}`)
    expect(result['@id']).toBe(`${containerUrl}${slug}`)
    expect(result.content).toContain('E2E Test Concept')
  })
})
