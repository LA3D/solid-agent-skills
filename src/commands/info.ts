import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'
import N3 from 'n3'
import jsonld from 'jsonld'

export async function info(url: string): Promise<void> {
  const base = url.endsWith('/') ? url : url + '/'
  const wellKnown = new URL('.well-known/solid', base).href

  const res = await fetchResource(wellKnown, 'text/turtle')
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${wellKnown}`, status: res.status })
    process.exitCode = 1
    return
  }

  // Parse Turtle to N-Quads, then to JSON-LD
  const quads = new N3.Parser({ baseIRI: wellKnown }).parse(res.body)
  const writer = new N3.Writer({ format: 'application/n-quads' })
  quads.forEach(q => writer.addQuad(q))
  const nquads = await new Promise<string>((resolve, reject) => {
    writer.end((err, result) => err ? reject(err) : resolve(result))
  })

  const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })
  const compacted = await compactOutput(expanded.length === 1 ? expanded[0] : expanded)

  if (Object.keys(res.headers).length > 0) {
    (compacted as Record<string, unknown>).affordances = res.headers
  }

  output(compacted)
}
