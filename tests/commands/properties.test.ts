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
    expect(result['@context']).toBeDefined()
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
    expect(predicates.some((p: string) => p.includes('prefLabel') || p.includes('label'))).toBe(true)
  })
})
