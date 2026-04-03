import { fetchResource } from '../lib/http.js'
import { output } from '../lib/jsonld.js'
import N3 from 'n3'

export async function links(url: string): Promise<void> {
  // Fetch resource to get describedby Link header
  const res = await fetchResource(url)
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  const describedby = res.headers.describedby
  if (!describedby) {
    output({ '@id': url, links: [], note: 'No describedby header — no .meta sidecar' })
    return
  }

  // Fetch the .meta sidecar
  const metaUrl = new URL(describedby as string, url).href
  const metaRes = await fetchResource(metaUrl, 'text/turtle')
  if (metaRes.status !== 200) {
    output({ error: `Failed to fetch .meta at ${metaUrl}`, status: metaRes.status })
    process.exitCode = 1
    return
  }

  // Parse Turtle and extract outgoing IRI references
  const quads = new N3.Parser({ baseIRI: metaUrl }).parse(metaRes.body)
  const outgoing = quads
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => ({ predicate: q.predicate.value, target: q.object.value }))

  // Deduplicate
  const seen = new Set<string>()
  const unique = outgoing.filter(l => {
    const key = `${l.predicate}|${l.target}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  output({ '@id': url, links: unique })
}
