import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import N3 from 'n3'
import { execSync } from 'child_process'
import { extractAffordanceQuery, substituteResource } from '../../src/commands/invoke.js'

const parse = (path: string) =>
  new N3.Parser({ baseIRI: 'https://pod.example/meta/affordances/x.ttl' }).parse(readFileSync(path, 'utf8'))

describe('invoke helpers (podless)', () => {
  it('extracts sub:selectQuery (post-D107 namespace)', () => {
    const q = extractAffordanceQuery(parse('tests/fixtures/descriptor-sub.ttl'))
    expect(q?.kind).toBe('select')
    expect(q?.query).toContain('as:object')
  })

  it('extracts wiki:constructQuery (legacy namespace)', () => {
    const q = extractAffordanceQuery(parse('tests/fixtures/descriptor-wiki.ttl'))
    expect(q?.kind).toBe('construct')
  })

  it('substitutes every %RESOURCE% occurrence', () => {
    const out = substituteResource('SELECT * WHERE { ?op <urn:p> <%RESOURCE%> . <%RESOURCE%> ?p ?o }',
      'https://pod.example/vault/wiki/concepts/a.md')
    expect(out).not.toContain('%RESOURCE%')
    expect(out.match(/concepts\/a\.md/g)?.length).toBe(2)
  })
})

const POD = process.env.SOLID_POD_URL || 'https://pod.vardeman.me/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('solid-pod invoke (live)', { timeout: 60_000 }, () => {
  it('invokes memory-history against a RESOURCE url (the post-D107 contract)', () => {
    const url = `${POD}wiki/concepts/photosynthesis.md`
    const out = execSync(`npx tsx src/cli.ts invoke ${url} memory-history`,
      { encoding: 'utf8', timeout: 55_000 })
    const r = JSON.parse(out)
    expect(r.error).toBeUndefined()
    expect(r.query).not.toContain('%RESOURCE%')
    expect(r.query).toContain(url)
    expect(Array.isArray(r.results)).toBe(true)
  })

  it('404 on a bad affordance name lists available names', () => {
    const url = `${POD}wiki/concepts/photosynthesis.md`
    try {
      execSync(`npx tsx src/cli.ts invoke ${url} operation-history`, { encoding: 'utf8', timeout: 55_000 })
      expect.unreachable('should have exited 1')
    } catch (e) {
      const r = JSON.parse((e as { stdout: string }).stdout)
      expect(r.error).toContain('not found')
      expect(r.available).toContain('memory-history')
    }
  })
})
