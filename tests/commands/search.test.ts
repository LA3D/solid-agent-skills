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
    expect(result.method).toMatch(/oslc|client/)
  })
})
