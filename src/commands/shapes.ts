import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'
import N3 from 'n3'
import jsonld from 'jsonld'

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
    const shapeQuads = new N3.Parser({ baseIRI: shapeUrl }).parse(shapeRes.body)
    const writer = new N3.Writer({ format: 'application/n-quads' })
    shapeQuads.forEach(q => writer.addQuad(q))
    const nquads = await new Promise<string>((resolve, reject) => {
      writer.end((err, r) => err ? reject(err) : resolve(r))
    })
    const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })
    const compactedNodes = []
    for (const node of expanded) {
      compactedNodes.push(await compactOutput(node))
    }
    shapeDocs.push({
      source: shapeUrl,
      nodes: compactedNodes.length === 1 ? compactedNodes[0] : compactedNodes,
    })
  }

  output({
    '@id': url,
    shapes: shapeDocs,
  })
}
