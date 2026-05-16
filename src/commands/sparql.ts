import { querySparql } from '../lib/comunica.js'
import { discoverMetaSources } from '../lib/http.js'
import { output } from '../lib/jsonld.js'

export interface SparqlOptions {
  noMeta?: boolean
  // Explicit Comunica sources (repeatable). When provided, .meta auto-discovery
  // is skipped — the caller has full control over the source set.
  source?: string[]
  // SPARQL Protocol default-graph-uri (repeatable). Each URI is added to the
  // Comunica source set as a named-graph source — the RQ-Pod-4 workaround for
  // Comunica's gap on `describedby` following.
  defaultGraphUri?: string[]
  // RFC 7089 Accept-Datetime — passed into Comunica's HTTP layer via a custom
  // fetch wrapper. Used for Memento time-travel queries.
  acceptDatetime?: string
}

export async function sparql(
  url: string,
  query: string,
  options: SparqlOptions = {},
): Promise<void> {
  try {
    let sources: string[]
    let metaCount = 0

    if (options.source && options.source.length > 0) {
      // Explicit --source flags short-circuit .meta auto-discovery.
      sources = options.source
    } else if (url.endsWith('/') && !options.noMeta) {
      // When targeting a container (URL ends in /), auto-discover .meta sidecar
      // URLs and include them as Comunica sources. Works around the Comunica
      // link-traversal gap where describedby headers on non-RDF resources are
      // never followed (RQ-Pod-4).
      const metaSources = await discoverMetaSources(url)
      sources = [url, ...metaSources]
      metaCount = metaSources.length
    } else {
      sources = [url]
    }

    const bindings = await querySparql(query, sources, {
      defaultGraphUris: options.defaultGraphUri,
      acceptDatetime: options.acceptDatetime,
    })
    const doc: Record<string, unknown> = {
      source: url,
      query,
      sources,
      metaSources: metaCount,
      results: bindings,
    }
    if (options.defaultGraphUri && options.defaultGraphUri.length) {
      doc.defaultGraphUris = options.defaultGraphUri
    }
    if (options.acceptDatetime) doc.acceptDatetime = options.acceptDatetime
    output(doc)
  } catch (err) {
    output({
      error: `SPARQL query failed: ${(err as Error).message}`,
      source: url,
      query,
    })
    process.exitCode = 1
  }
}
