import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod read', { timeout: 30_000 }, () => {
  it('returns content + affordances for a container', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts read ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['@id']).toBe(url)
    expect(result.affordances).toBeDefined()
    expect(result.content).toBeDefined()
  })

  it('includes dct:format content type', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts read ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['dct:format']).toBeDefined()
  })

  it('includes .meta when describedby header present', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(`npx tsx src/cli.ts read ${url}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    if (result.affordances?.describedby) {
      expect(result.meta).toBeDefined()
      // meta should be compacted JSON-LD with @context
      expect(result.meta['@context']).toBeDefined()
    }
  })
})
