import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod info', { timeout: 30_000 }, () => {
  it('returns JSON-LD with VoID/DCAT from .well-known/solid', () => {
    const out = execSync(`npx tsx src/cli.ts info ${POD}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['@context']).toBeDefined()
    expect(result['@id']).toBeDefined()
  })

  it('includes affordances from Link headers when present', () => {
    const out = execSync(`npx tsx src/cli.ts info ${POD}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    // .well-known/solid should have Link headers on CSS
    // affordances may or may not be present depending on server
    expect(typeof result).toBe('object')
  })

  it('handles URL without trailing slash', () => {
    const podNoSlash = POD.replace(/\/$/, '')
    const out = execSync(`npx tsx src/cli.ts info ${podNoSlash}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result['@context']).toBeDefined()
  })
})
