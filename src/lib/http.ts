import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from 'undici'

/**
 * Zero-config TLS trust for mkcert dev certs.
 *
 * Node-based fetch uses undici, which reads `NODE_EXTRA_CA_CERTS` only at
 * process startup. If the user forgets to set it before invoking the CLI,
 * every request fails with SELF_SIGNED_CERT_IN_CHAIN. The D85-correct fix
 * is `NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`, but agents have
 * been observed reaching for the unsafe `NODE_TLS_REJECT_UNAUTHORIZED=0`
 * instead.
 *
 * This probe: if NODE_EXTRA_CA_CERTS is unset AND mkcert is installed AND
 * its rootCA.pem exists, register it via undici's global dispatcher so
 * every subsequent fetch() trusts that CA without disabling verification.
 * Silent on success; falls through cleanly when mkcert isn't installed
 * (production case — system trust store handles real certs).
 */
function setupTlsTrust(): void {
  if (process.env.NODE_EXTRA_CA_CERTS) return  // user already wired it
  try {
    const caroot = execSync('mkcert -CAROOT', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
    const caPath = join(caroot, 'rootCA.pem')
    if (!existsSync(caPath)) return
    const ca = readFileSync(caPath)
    setGlobalDispatcher(new Agent({ connect: { ca } }))
  } catch {
    // mkcert not on PATH; rely on system trust store
  }
}
setupTlsTrust()

/**
 * Wraps fetch() to surface a clear remediation message on TLS cert errors.
 * Agents have been observed reaching for NODE_TLS_REJECT_UNAUTHORIZED=0
 * when the right fix is NODE_EXTRA_CA_CERTS; this catches the underlying
 * Node error code and names the correct env var.
 */
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    // Use undici's fetch directly so setGlobalDispatcher() trust changes take effect.
    // Node's global fetch may not honor our dispatcher depending on bundling/version.
    return await undiciFetch(url, init as Parameters<typeof undiciFetch>[1]) as unknown as Response
  } catch (err: unknown) {
    const e = err as { code?: string; cause?: { code?: string }; message?: string }
    const code = e?.cause?.code ?? e?.code
    if (code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        code === 'CERT_HAS_EXPIRED') {
      throw new Error(
        `TLS verification failed against the system trust store while fetching ${url} (${code}). ` +
        `If using an mkcert dev cert, run:\n` +
        `  export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"\n` +
        `(D85 — solid-tls-deployment skill has full context.)\n` +
        `Do NOT set NODE_TLS_REJECT_UNAUTHORIZED=0 — that disables verification globally.\n` +
        `Original error: ${e.message ?? String(err)}`
      )
    }
    throw err
  }
}

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
  const res = await safeFetch(url, { headers: hdrs })
  const body = await res.text()
  return {
    status: res.status,
    headers: parseLinkHeaders(res.headers.get('link')),
    contentType: res.headers.get('content-type') ?? '',
    body,
  }
}

export async function putResource(url: string, body: string, contentType: string): Promise<FetchResult> {
  const res = await safeFetch(url, {
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
  const res = await safeFetch(url, {
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
