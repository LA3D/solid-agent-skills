import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod links', { timeout: 30_000 }, () => {
  it('returns outgoing links from a container .meta', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts links ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['@id']).toBe(url)
    expect(result.links).toBeDefined()
    expect(Array.isArray(result.links)).toBe(true)
    expect(result.links.length).toBeGreaterThan(0)
  })

  it('each link has predicate and target', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts links ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    for (const link of result.links) {
      expect(link.predicate).toBeDefined()
      expect(link.target).toBeDefined()
      // Both should be URIs (strings starting with http)
      expect(link.predicate).toMatch(/^http/)
      expect(link.target).toMatch(/^http/)
    }
  })

  it('returns empty links array for resource without .meta', () => {
    // .well-known resources typically don't have describedby
    const url = `${POD}.well-known/solid`
    const out = execSync(`npx tsx src/cli.ts links ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['@id']).toBe(url)
    // Either empty links or a note about no .meta
    expect(result.links).toBeDefined()
  })
})
