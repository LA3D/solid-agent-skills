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
})
