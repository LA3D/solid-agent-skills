import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod backlinks', { timeout: 60_000 }, () => {
  it('finds backlinks to a container', () => {
    // The concepts container should be referenced from the pod root or type index
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts backlinks ${url} --source ${POD}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result['@id']).toBe(url)
    expect(result.source).toBe(POD)
    expect(result.backlinks).toBeDefined()
    expect(Array.isArray(result.backlinks)).toBe(true)
  })

  it('each backlink has from and predicate', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts backlinks ${url} --source ${POD}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    for (const bl of result.backlinks) {
      expect(bl.from).toBeDefined()
      expect(bl.predicate).toBeDefined()
      expect(bl.from).toMatch(/^http/)
      expect(bl.predicate).toMatch(/^http/)
    }
  })

  it('defaults source from target URL when --source not given', () => {
    const url = `${POD}resources/concepts/`
    const out = execSync(
      `npx tsx src/cli.ts backlinks ${url}`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 55_000 },
    )
    const result = JSON.parse(out)
    expect(result['@id']).toBe(url)
    // Source should be derived from the URL (parent container)
    expect(result.source).toBeDefined()
  })
})
