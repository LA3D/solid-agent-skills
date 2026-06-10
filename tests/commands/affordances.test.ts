import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'https://pod.vardeman.me/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod affordances', { timeout: 60_000 }, () => {
  it('lists the catalog from any resource URL', () => {
    const out = execSync(`npx tsx src/cli.ts affordances ${POD}wiki/concepts/photosynthesis.md`,
      { encoding: 'utf8', timeout: 55_000 })
    const r = JSON.parse(out)
    expect(r.catalog).toContain('/meta/affordances/')
    expect(r.affordances).toContain('memory-history')
    expect(r.usage).toContain('invoke')
  })
})
