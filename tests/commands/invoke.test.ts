import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import N3 from 'n3'
import { execSync } from 'child_process'
import { extractAffordanceQuery, substituteResource, substituteParams } from '../../src/commands/invoke.js'

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

describe('substituteParams (podless)', () => {
  it('replaces $orcid with an IRI value', () => {
    const query = 'SELECT ?p WHERE { ?p owl:sameAs $orcid }'
    const out = substituteParams(query, { orcid: '<https://orcid.org/x>' })
    expect(out).toContain('owl:sameAs <https://orcid.org/x>')
    expect(out).not.toContain('$orcid')
  })

  it('respects word boundaries — $org does not clobber $organization', () => {
    const out = substituteParams('$org $organization', { org: 'X' })
    expect(out).toBe('X $organization')
  })

  it('substitutes multiple distinct params', () => {
    const query = 'SELECT * WHERE { $subj $pred $obj }'
    const out = substituteParams(query, { subj: '<urn:s>', pred: '<urn:p>', obj: '"val"' })
    expect(out).toBe('SELECT * WHERE { <urn:s> <urn:p> "val" }')
  })

  it('inserts values with regex replacement metachars ($&, $1) verbatim', () => {
    const out = substituteParams('SELECT $x', { x: '<a$&b$1c>' })
    expect(out).toBe('SELECT <a$&b$1c>')
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

  it('contact-find-by-orcid: $param substitution + discoverQuerySources default finds marie-curie by Wikidata IRI', () => {
    // marie-curie.ttl is always seeded by make reset; owl:sameAs <http://www.wikidata.org/entity/Q7186>
    const container = `${POD}contacts/Person/`
    const wikidataIri = '<http://www.wikidata.org/entity/Q7186>'
    const out = execSync(
      `npx tsx src/cli.ts invoke ${container} contact-find-by-orcid --param "orcid=${wikidataIri}"`,
      { encoding: 'utf8', timeout: 55_000 },
    )
    const r = JSON.parse(out)
    expect(r.error).toBeUndefined()
    // Substitution: no bare $orcid left in the query
    expect(r.query).not.toContain('$orcid')
    // The Wikidata IRI should appear in the substituted query
    expect(r.query).toContain('Q7186')
    // At least one result binding whose value includes 'marie-curie'
    expect(Array.isArray(r.results)).toBe(true)
    expect(r.results.length).toBeGreaterThan(0)
    const found = r.results.some((row: Record<string, { value: string }>) =>
      Object.values(row).some(v => v.value.includes('marie-curie')),
    )
    expect(found, `Expected a marie-curie binding; got: ${JSON.stringify(r.results)}`).toBe(true)
  })

  it('memory-history regression: still uses .operations/ default and returns an array (no --param regression)', () => {
    // Confirm the %RESOURCE% branch is unaffected by the param-substitution change.
    const url = `${POD}wiki/concepts/photosynthesis.md`
    const out = execSync(`npx tsx src/cli.ts invoke ${url} memory-history`,
      { encoding: 'utf8', timeout: 55_000 })
    const r = JSON.parse(out)
    expect(r.error).toBeUndefined()
    // Default sources should include the .operations/ path (not contacts)
    expect(r.sources.some((s: string) => s.includes('.operations'))).toBe(true)
    expect(Array.isArray(r.results)).toBe(true)
  })
})
