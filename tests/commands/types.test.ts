import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod types', { timeout: 60_000 }, () => {
  it('returns type counts from a container', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts types ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 55_000,
    })
    const result = JSON.parse(out)
    expect(result.source).toBe(url)
    expect(result.types).toBeDefined()
    expect(Array.isArray(result.types)).toBe(true)
    expect(result.types.length).toBeGreaterThan(0)
  })

  it('each type entry has type and count', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts types ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 55_000,
    })
    const result = JSON.parse(out)
    for (const entry of result.types) {
      expect(entry.type).toBeDefined()
      expect(typeof entry.type).toBe('string')
      expect(entry.count).toBeDefined()
      expect(typeof entry.count).toBe('number')
      expect(entry.count).toBeGreaterThan(0)
    }
  })
})
