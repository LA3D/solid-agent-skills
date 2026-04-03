import { querySparql } from '../lib/comunica.js'
import { discoverMetaSources } from '../lib/http.js'
import { output } from '../lib/jsonld.js'

export async function sparql(
  url: string,
  query: string,
  options: { noMeta?: boolean } = {},
): Promise<void> {
  try {
    // When targeting a container (URL ends in /), auto-discover .meta
    // sidecar URLs and include them as Comunica sources. This works
    // around the Comunica link-traversal gap where describedby headers
    // on non-RDF resources are never followed.
    let sources = [url]
    let metaCount = 0

    if (url.endsWith('/') && !options.noMeta) {
      const metaSources = await discoverMetaSources(url)
      sources = [url, ...metaSources]
      metaCount = metaSources.length
    }

    const bindings = await querySparql(query, sources)
    output({
      source: url,
      query,
      metaSources: metaCount,
      results: bindings,
    })
  } catch (err) {
    output({
      error: `SPARQL query failed: ${(err as Error).message}`,
      source: url,
      query,
    })
    process.exitCode = 1
  }
}
