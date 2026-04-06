export interface LinkHeaders {
  describedby?: string
  type?: string[]
  acl?: string
  constrainedBy?: string
  [key: string]: string | string[] | undefined
}

export function parseLinkHeaders(header: string | null): LinkHeaders {
  if (!header) return {}
  const result: LinkHeaders = {}

  // Split on comma, but only outside angle brackets
  const parts: string[] = []
  let depth = 0, start = 0
  for (let i = 0; i < header.length; i++) {
    if (header[i] === '<') depth++
    else if (header[i] === '>') depth--
    else if (header[i] === ',' && depth === 0) {
      parts.push(header.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(header.slice(start).trim())

  for (const part of parts) {
    const uriMatch = part.match(/^<([^>]*)>/)
    const relMatch = part.match(/rel="([^"]*)"/)
    if (!uriMatch || !relMatch) continue
    const uri = uriMatch[1]
    const rel = relMatch[1]

    if (rel === 'type') {
      const existing = result.type
      result.type = existing ? [...existing, uri] : [uri]
    } else {
      result[rel] = uri
    }
  }
  return result
}

export interface FetchResult {
  status: number
  headers: LinkHeaders
  contentType: string
  body: string
}

export async function fetchResource(url: string, accept?: string): Promise<FetchResult> {
  const hdrs: Record<string, string> = {}
  if (accept) hdrs['Accept'] = accept
  const res = await fetch(url, { headers: hdrs })
  const body = await res.text()
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') ?? '',
    body,
  }
}

export async function putResource(url: string, body: string, contentType: string): Promise<FetchResult> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  })
  const text = await res.text()
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') ?? '',
    body: text,
  }
}

/**
 * Discover .meta sidecar URLs for all resources in a container.
 *
 * Comunica's link-traversal cannot follow `describedby` Link headers on
 * non-RDF resources (the RDF parse failure skips metadata extraction).
 * This function works around that gap by:
 * 1. Fetching the container listing (Turtle)
 * 2. Parsing ldp:contains to find contained resources
 * 3. Constructing .meta URLs for each resource
 *
 * Returns the .meta URLs suitable for use as explicit Comunica sources.
 * See: vault finding "Comunica Link-Traversal Meta Sidecar Gap"
 */
export async function discoverMetaSources(containerUrl: string): Promise<string[]> {
  const url = containerUrl.endsWith('/') ? containerUrl : containerUrl + '/'
  const res = await fetchResource(url, 'text/turtle')
  if (res.status !== 200) return []

  const N3 = (await import('n3')).default
  const quads = new N3.Parser({ baseIRI: url }).parse(res.body)
  const ldpContains = 'http://www.w3.org/ns/ldp#contains'

  return quads
    .filter(q => q.predicate.value === ldpContains)
    .map(q => q.object.value)
    .filter(u => !u.endsWith('/'))  // skip sub-containers
    .map(u => u + '.meta')
}

export async function patchResource(url: string, n3patch: string): Promise<FetchResult> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/n3' },
    body: n3patch,
  })
  const text = await res.text()
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') ?? '',
    body: text,
  }
}
