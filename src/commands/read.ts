import { fetchResource } from '../lib/http.js'
import { compactOutput, output } from '../lib/jsonld.js'
import N3 from 'n3'
import jsonld from 'jsonld'

export async function read(url: string): Promise<void> {
  const res = await fetchResource(url)
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  const result: Record<string, unknown> = {
    '@id': url,
    'dct:format': res.contentType,
    content: res.body,
    affordances: res.headers,
  }

  // If describedby link exists, fetch .meta and include as JSON-LD
  if (res.headers.describedby) {
    const metaUrl = new URL(res.headers.describedby as string, url).href
    const metaRes = await fetchResource(metaUrl, 'text/turtle')
    if (metaRes.status === 200) {
      const quads = new N3.Parser({ baseIRI: metaUrl }).parse(metaRes.body)
      const writer = new N3.Writer({ format: 'application/n-quads' })
      quads.forEach(q => writer.addQuad(q))
      const nquads = await new Promise<string>((resolve, reject) => {
        writer.end((err, r) => err ? reject(err) : resolve(r))
      })
      const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })
      result.meta = await compactOutput(expanded.length === 1 ? expanded[0] : expanded)
    }
  }

  output(result)
}
