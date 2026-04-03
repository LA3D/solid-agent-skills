import { describe, it, expect, afterAll } from 'vitest'
import { execSync } from 'child_process'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod create', { timeout: 30_000 }, () => {
  const slug = `test-create-${Date.now()}.md`
  const containerUrl = `${POD}resources/concepts/`

  afterAll(async () => {
    try { await fetch(`${containerUrl}${slug}`, { method: 'DELETE' }) } catch {}
  })

  it('creates a resource and returns status', () => {
    const out = execSync(
      `npx tsx src/cli.ts create ${containerUrl} --slug "${slug}" --body "# Test Note"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.status).toBe('created')
    expect(result['@id']).toContain(slug)
    expect(result.contentType).toBe('text/markdown')
    expect(result.metaPatched).toBe(false)
  })

  it('resource is retrievable after creation', () => {
    const res = execSync(
      `npx tsx src/cli.ts read ${containerUrl}${slug}`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(res)
    expect(result['@id']).toBe(`${containerUrl}${slug}`)
    expect(result.content).toContain('# Test Note')
  })
})

describe.skipIf(!podAvailable)('solid-pod create --meta', { timeout: 30_000 }, () => {
  const slug = `test-meta-${Date.now()}.md`
  const containerUrl = `${POD}resources/concepts/`

  afterAll(async () => {
    try { await fetch(`${containerUrl}${slug}`, { method: 'DELETE' }) } catch {}
  })

  it('creates resource and patches .meta', () => {
    const triples = `<> <http://purl.org/dc/terms/title> "Test Resource" .`
    const out = execSync(
      `npx tsx src/cli.ts create ${containerUrl} --slug "${slug}" --body "# Meta Test" --meta '${triples}'`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.status).toBe('created')
    expect(result.metaPatched).toBe(true)
  })
})
