import { describe, it, expect } from 'vitest'
import { parseLinkHeaders } from '../../src/lib/http.js'

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
