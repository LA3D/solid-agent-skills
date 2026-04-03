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
