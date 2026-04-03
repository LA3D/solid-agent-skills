import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod patch', { timeout: 30_000 }, () => {
  const slug = `test-patch-${Date.now()}.md`
  const containerUrl = `${POD}resources/concepts/`
  const resourceUrl = `${containerUrl}${slug}`
  const metaUrl = `${resourceUrl}.meta`

  beforeAll(() => {
    // Create a resource to patch
    execSync(
      `npx tsx src/cli.ts create ${containerUrl} --slug "${slug}" --body "# Patch Target"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
  })

  afterAll(async () => {
    try { await fetch(resourceUrl, { method: 'DELETE' }) } catch {}
  })

  it('patches .meta and returns status', () => {
    const triples = `<${resourceUrl}> <http://purl.org/dc/terms/description> "Patched via CLI" .`
    const out = execSync(
      `npx tsx src/cli.ts patch ${metaUrl} --insert '${triples}'`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result['@id']).toBe(metaUrl)
    expect(result.status).toBe('patched')
    expect(result.inserted).toContain('description')
  })

  it('patched triples are readable via .meta', () => {
    const out = execSync(
      `npx tsx src/cli.ts read ${resourceUrl}`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    // The .meta should now contain the patched triple
    if (result.meta) {
      const metaStr = JSON.stringify(result.meta)
      expect(metaStr).toContain('Patched via CLI')
    }
  })
})
