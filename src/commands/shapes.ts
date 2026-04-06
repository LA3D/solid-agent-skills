import { fetchResource } from '../lib/http.js'
import { turtleToJsonld, output } from '../lib/jsonld.js'
import N3 from 'n3'

export async function shapes(url: string): Promise<void> {
  // Fetch the shapes container listing
  const res = await fetchResource(url, 'text/turtle')
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  // Parse container to find .ttl resources via ldp:contains
  const quads = new N3.Parser({ baseIRI: url }).parse(res.body)
  const ldpContains = 'http://www.w3.org/ns/ldp#contains'
  const shapeUrls = quads
    .filter(q => q.predicate.value === ldpContains)
    .map(q => q.object.value)
    .filter(u => u.endsWith('.ttl'))

  // Fetch each shape file and convert to JSON-LD
  const shapeDocs = []
  for (const shapeUrl of shapeUrls) {
    const shapeRes = await fetchResource(shapeUrl, 'text/turtle')
    if (shapeRes.status !== 200) continue
    const compacted = await turtleToJsonld(shapeRes.body, shapeUrl)
    shapeDocs.push({ source: shapeUrl, nodes: compacted })
  }

  output({
    '@id': url,
    shapes: shapeDocs,
  })
}
