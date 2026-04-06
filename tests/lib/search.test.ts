import { describe, it, expect, vi } from 'vitest'
import { searchMeta } from '../../src/commands/search.js'
import { collectPredicates } from '../../src/commands/properties.js'

// Mock fetchResource to return test Turtle without network
vi.mock('../../src/lib/http.js', () => ({
  fetchResource: vi.fn(async (url: string) => {
    if (url === 'http://example.org/test.md.meta') {
      return {
        status: 200,
        headers: {},
        contentType: 'text/turtle',
        body: `
          @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
          @prefix dct: <http://purl.org/dc/terms/> .
          <http://example.org/test.md>
            skos:prefLabel "Knowledge Graphs Overview" ;
            dct:subject "knowledge-graphs", "semantic-web" ;
            dct:description "A survey of knowledge graph techniques" .
        `,
      }
    }
    if (url === 'http://example.org/empty.md.meta') {
      return { status: 200, headers: {}, contentType: 'text/turtle', body: '' }
    }
    return { status: 404, headers: {}, contentType: '', body: '' }
  }),
  discoverMetaSources: vi.fn(),
}))

describe('searchMeta', () => {
  it('finds matching literals and returns structured results', async () => {
    const results = await searchMeta(
      'http://example.org/test.md.meta',
      /knowledge/i,
    )
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].resource).toBe('http://example.org/test.md')
    expect(results[0].label).toBe('Knowledge Graphs Overview')
    expect(results[0].matchedPredicate).toBeDefined()
    expect(results[0].matchedValue).toMatch(/knowledge/i)
  })

  it('returns empty for no matches', async () => {
    const results = await searchMeta(
      'http://example.org/test.md.meta',
      /xyznonexistent/i,
    )
    expect(results).toEqual([])
  })

  it('returns empty for 404', async () => {
    const results = await searchMeta(
      'http://example.org/missing.md.meta',
      /anything/i,
    )
    expect(results).toEqual([])
  })

  it('returns empty for empty Turtle', async () => {
    const results = await searchMeta(
      'http://example.org/empty.md.meta',
      /anything/i,
    )
    expect(results).toEqual([])
  })

  it('extracts label from skos:prefLabel', async () => {
    const results = await searchMeta(
      'http://example.org/test.md.meta',
      /survey/i,
    )
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe('Knowledge Graphs Overview')
  })
})

describe('collectPredicates', () => {
  it('returns all predicate URIs from Turtle', async () => {
    const predicates = await collectPredicates('http://example.org/test.md.meta')
    expect(predicates.length).toBeGreaterThan(0)
    expect(predicates).toContain('http://www.w3.org/2004/02/skos/core#prefLabel')
    expect(predicates).toContain('http://purl.org/dc/terms/subject')
    expect(predicates).toContain('http://purl.org/dc/terms/description')
  })

  it('returns empty for 404', async () => {
    const predicates = await collectPredicates('http://example.org/missing.md.meta')
    expect(predicates).toEqual([])
  })

  it('returns empty for empty Turtle', async () => {
    const predicates = await collectPredicates('http://example.org/empty.md.meta')
    expect(predicates).toEqual([])
  })
})
