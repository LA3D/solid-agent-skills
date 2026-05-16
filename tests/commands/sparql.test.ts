import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod sparql', { timeout: 30_000 }, () => {
  it('executes raw SPARQL and returns results', () => {
    const query = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 3'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${POD}" "${query}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.results).toBeDefined()
    expect(result.results.length).toBeGreaterThan(0)
    expect(result.source).toBe(POD)
    expect(result.query).toBe(query)
  })

  it('includes source and query in error output', () => {
    const badQuery = 'NOT VALID SPARQL'
    try {
      execSync(
        `npx tsx src/cli.ts sparql "${POD}" "${badQuery}"`,
        { encoding: 'utf8', cwd: process.cwd() },
      )
    } catch (e: unknown) {
      const err = e as { stdout: string }
      const result = JSON.parse(err.stdout)
      expect(result.error).toBeDefined()
      expect(result.source).toBe(POD)
      expect(result.query).toBe(badQuery)
    }
  })

  it('accepts repeated --source flags as explicit Comunica sources', () => {
    const src1 = POD + 'wiki/pages/'
    const src2 = POD + 'wiki/sources/'
    const query = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${POD}" "${query}" --source "${src1}" --source "${src2}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.sources).toEqual([src1, src2])
    // explicit --source must short-circuit .meta auto-discovery
    expect(result.metaSources).toBe(0)
  })

  it('accepts repeated --default-graph-uri (RQ-Pod-4 workaround)', () => {
    const graph = POD + 'wiki/pages/'
    const query = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${POD}" "${query}" --source "${POD}" --default-graph-uri "${graph}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.defaultGraphUris).toEqual([graph])
  })

  it('accepts --accept-datetime flag and surfaces it in output', () => {
    // Memento integration: the flag is reported in the JSON output so callers
    // can verify it was applied. Actual time-travel behavior is exercised by
    // the memento extension's own tests.
    const query = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1'
    const datetime = 'Thu, 01 Jan 2026 00:00:00 GMT'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${POD}" "${query}" --source "${POD}" --accept-datetime "${datetime}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.acceptDatetime).toBe(datetime)
  })
})
