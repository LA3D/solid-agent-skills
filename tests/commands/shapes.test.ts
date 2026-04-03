import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod shapes', { timeout: 30_000 }, () => {
  it('lists SHACL shapes from the shapes container', () => {
    const url = `${POD}procedures/shapes/`
    const out = execSync(`npx tsx src/cli.ts shapes ${url}`, {
      encoding: 'utf8', cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    expect(result.shapes).toBeDefined()
    expect(result.shapes.length).toBeGreaterThan(0)
  })

  it('includes sh:agentInstruction in shape output', () => {
    const url = `${POD}procedures/shapes/`
    const out = execSync(`npx tsx src/cli.ts shapes ${url}`, {
      encoding: 'utf8', cwd: process.cwd(),
    })
    const result = JSON.parse(out)
    // concept-note.ttl has sh:agentInstruction
    const json = JSON.stringify(result)
    expect(json).toContain('agentInstruction')
  })
})
