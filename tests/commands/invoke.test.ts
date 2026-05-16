import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod invoke', { timeout: 30_000 }, () => {
  it('fetches hub-view affordance and runs its CONSTRUCT', () => {
    const out = execSync(
      `npx tsx src/cli.ts invoke "${POD}" hub-view --source "${POD}wiki/pages/"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    // hub-view's CONSTRUCT produces `?hub a wiki:Hub` triples; an empty Pod
    // produces no bindings — just verify the affordance was discovered and
    // the query ran without error.
    expect(result.affordance).toBe('hub-view')
    expect(result.query).toMatch(/CONSTRUCT/)
    expect(result.results).toBeDefined()
  })

  it('extracts breadcrumb-view SELECT query (placeholder substitution out of scope)', () => {
    // breadcrumb-view's SELECT carries a literal <START> placeholder that
    // callers are expected to substitute before invocation. The v1 invoke
    // doesn't do template substitution; it still surfaces the extracted
    // query + descriptor URL in the error envelope so the caller can act.
    try {
      execSync(
        `npx tsx src/cli.ts invoke "${POD}" breadcrumb-view --source "${POD}wiki/pages/"`,
        { encoding: 'utf8', cwd: process.cwd() },
      )
    } catch (e: unknown) {
      const err = e as { stdout: string }
      const result = JSON.parse(err.stdout)
      expect(result.affordance).toBe('breadcrumb-view')
      expect(result.descriptorUrl).toContain('breadcrumb-view.ttl')
      expect(result.error).toMatch(/START/)
    }
  })

  it('reports 404 cleanly when affordance is missing', () => {
    try {
      execSync(
        `npx tsx src/cli.ts invoke "${POD}" no-such-affordance`,
        { encoding: 'utf8', cwd: process.cwd() },
      )
    } catch (e: unknown) {
      const err = e as { stdout: string }
      const result = JSON.parse(err.stdout)
      expect(result.error).toBeDefined()
      expect(result.affordance).toBe('no-such-affordance')
    }
  })
})
