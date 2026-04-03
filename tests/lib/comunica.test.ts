import { describe, it, expect } from 'vitest'
import { querySparql } from '../../src/lib/comunica.js'

const POD = process.env.SOLID_POD_URL || 'http://pod.vardeman.me:3000/vault/'
const podAvailable = await fetch(POD).then(() => true).catch(() => false)

describe.skipIf(!podAvailable)('querySparql (integration)', () => {
  it('runs a SELECT query against the pod', async () => {
    const result = await querySparql(
      `SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 3`,
      [POD],
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('s')
    expect(result[0].s).toHaveProperty('type')
    expect(result[0].s).toHaveProperty('value')
  })

  it('returns empty array for query with no matches', async () => {
    const result = await querySparql(
      `SELECT ?s WHERE { ?s <http://example.org/nonexistent-predicate-xyz> "nope" }`,
      [POD],
    )
    expect(result).toEqual([])
  })
}, { timeout: 30_000 })
