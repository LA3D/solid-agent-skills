import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { parseLinkHeaders, discoverQuerySources } from '../../src/lib/http.js'

const POD = process.env.SOLID_POD_URL || 'https://pod.vardeman.me/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe('parseLinkHeaders', () => {
  it('parses describedby link', () => {
    const hdr = '<.meta>; rel="describedby"'
    const links = parseLinkHeaders(hdr)
    expect(links.describedby).toBe('.meta')
  })

  it('handles missing/null header', () => {
    expect(parseLinkHeaders(null)).toEqual({})
    expect(parseLinkHeaders('')).toEqual({})
  })

  it('parses multiple type links into array', () => {
    const hdr = '<http://www.w3.org/ns/ldp#Resource>; rel="type", <http://www.w3.org/ns/ldp#Container>; rel="type"'
    const links = parseLinkHeaders(hdr)
    expect(links.type).toEqual([
      'http://www.w3.org/ns/ldp#Resource',
      'http://www.w3.org/ns/ldp#Container',
    ])
  })

  it('parses constrainedBy link', () => {
    const hdr = '<http://pod.vardeman.me:3000/vault/procedures/shapes/concept-note.ttl>; rel="constrainedBy"'
    const links = parseLinkHeaders(hdr)
    expect(links.constrainedBy).toBe('http://pod.vardeman.me:3000/vault/procedures/shapes/concept-note.ttl')
  })

  it('parses combined CSS-style Link header', () => {
    const hdr = '<.meta>; rel="describedby", <http://www.w3.org/ns/ldp#Resource>; rel="type", <http://www.w3.org/ns/ldp#Container>; rel="type"'
    const links = parseLinkHeaders(hdr)
    expect(links.describedby).toBe('.meta')
    expect(links.type).toEqual([
      'http://www.w3.org/ns/ldp#Resource',
      'http://www.w3.org/ns/ldp#Container',
    ])
  })

  it('handles acl link', () => {
    const hdr = '<.acl>; rel="acl"'
    const links = parseLinkHeaders(hdr)
    expect(links.acl).toBe('.acl')
  })
})

// ---------------------------------------------------------------------------
// discoverQuerySources — content-type-driven branching (live Pod required)
// ---------------------------------------------------------------------------

describe.skipIf(!podAvailable)('discoverQuerySources — native RDFSource members', { timeout: 30_000 }, () => {
  it('returns member body URL (not .meta) for native Turtle contacts', async () => {
    // contacts/Person/ contains marie-curie.ttl (text/turtle) — seeded by make reset.
    // The body IS the graph; querying the .meta sidecar returns empty (the bug).
    const contactsUrl = POD + 'contacts/Person/'
    const sources = await discoverQuerySources(contactsUrl)
    const marieCurieBody = sources.find(u => u.includes('marie-curie') && !u.endsWith('.meta'))
    const marieCurieMeta = sources.find(u => u.includes('marie-curie') && u.endsWith('.meta'))
    expect(marieCurieBody).toBeDefined()  // body URL present
    expect(marieCurieMeta).toBeUndefined() // .meta NOT included for RDFSource
  })
})

describe.skipIf(!podAvailable)('discoverQuerySources — non-RDF (markdown) members', { timeout: 30_000 }, () => {
  it('returns .meta sidecar URL (not body) for markdown wiki concepts', async () => {
    // wiki/concepts/ contains markdown concept notes — the dual-layer model.
    // The body is markdown (non-RDF); the projected RDF lives in .meta.
    const wikiUrl = POD + 'wiki/concepts/'
    const sources = await discoverQuerySources(wikiUrl)
    // All sources should be .meta sidecars; none should be bare .md URLs
    const bareMarkdown = sources.filter(u => u.endsWith('.md') && !u.endsWith('.md.meta'))
    const metaSidecars = sources.filter(u => u.endsWith('.meta'))
    expect(bareMarkdown).toHaveLength(0)    // no bare .md in source set
    expect(metaSidecars.length).toBeGreaterThan(0) // .meta entries present
  })
})

// ---------------------------------------------------------------------------
// End-to-end SPARQL fix: native-RDF container query returns non-empty results
// ---------------------------------------------------------------------------

describe.skipIf(!podAvailable)('solid-pod sparql — native RDFSource container (bug regression)', { timeout: 60_000 }, () => {
  it('finds marie-curie via owl:sameAs when querying contacts/Person/', () => {
    // Before the fix: discoverMetaSources returned .meta URLs for .ttl members,
    // querying empty .meta sidecars → silent empty results.
    // After the fix: the body URL is used → the real triples are found.
    const query = 'PREFIX owl: <http://www.w3.org/2002/07/owl#> SELECT ?s WHERE { ?s owl:sameAs <http://www.wikidata.org/entity/Q7186> }'
    const out = execSync(
      `npx tsx src/cli.ts sparql "${POD}contacts/Person/" "${query}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const result = JSON.parse(out)
    expect(result.results).toBeDefined()
    expect(result.results.length).toBeGreaterThan(0)
    const sValue: string = result.results[0]?.s?.value ?? ''
    expect(sValue).toMatch(/marie-curie/i)
  })
})
