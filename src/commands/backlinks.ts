import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function backlinks(
  url: string,
  opts: { source?: string },
): Promise<void> {
  const source = opts.source ?? url.replace(/\/[^/]*\/?$/, '/')
  const query = `SELECT ?s ?p WHERE { ?s ?p <${url}> }`

  try {
    const bindings = await querySparql(query, [source])
    const results = bindings.map(b => ({
      from: b.s.value,
      predicate: b.p.value,
    }))
    output({ '@id': url, source, backlinks: results })
  } catch (err) {
    output({
      error: `Backlinks query failed: ${(err as Error).message}`,
      source,
      '@id': url,
    })
    process.exitCode = 1
  }
}
