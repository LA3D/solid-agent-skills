import { describe, it, expect } from 'vitest'
import { compactOutput } from '../../src/lib/jsonld.js'

describe('compactOutput', () => {
  it('compacts expanded RDF to JSON-LD with shared context', async () => {
    const expanded = {
      '@id': 'http://pod.vardeman.me:3000/vault/',
      'http://purl.org/dc/terms/title': [{ '@value': 'Vault' }],
      '@type': ['http://www.w3.org/ns/ldp#Container']
    }
    const result = await compactOutput(expanded)
    expect(result['@context']).toBeDefined()
    expect(result['dct:title']).toBe('Vault')
    expect(result['@type']).toBe('ldp:Container')
  })
})
