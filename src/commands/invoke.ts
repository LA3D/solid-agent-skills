import N3 from 'n3'
import { fetchResource, discoverMetaSources } from '../lib/http.js'
import { querySparql, queryQuads } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

// Wiki vocabulary IRI matching the running Pod's ontology document
// (overlays/wiki-memory/ontology/wiki.ttl). Affordance descriptors use this
// namespace for wiki:constructQuery / wiki:selectQuery / wiki:targetClass.
const WIKI_NS = 'https://pod.vardeman.me:3000/vault/ontology/wiki#'

export interface InvokeOptions {
  source?: string[]
  defaultGraphUri?: string[]
  acceptDatetime?: string
}

/**
 * Fetch an affordance descriptor at <podUrl>meta/affordances/<name>.ttl,
 * extract its wiki:constructQuery or wiki:selectQuery, and run it via the
 * embedded Comunica engine. Closes the loop on D52's "machine-actionable
 * affordance" promise: the descriptor declares the capability the agent
 * needs and quotes the query; the agent executes it locally.
 */
export async function invoke(
  podUrl: string,
  affordanceName: string,
  options: InvokeOptions = {},
): Promise<void> {
  const root = podUrl.endsWith('/') ? podUrl : podUrl + '/'
  const descriptorUrl = `${root}meta/affordances/${affordanceName}.ttl`
  try {
    const res = await fetchResource(descriptorUrl, 'text/turtle')
    if (res.status !== 200) {
      output({
        error: `Affordance ${affordanceName} not found at ${descriptorUrl}: HTTP ${res.status}`,
        affordance: affordanceName,
        descriptorUrl,
      })
      process.exitCode = 1
      return
    }

    const quads = new N3.Parser({ baseIRI: descriptorUrl }).parse(res.body)
    const constructQ = quads.find(q => q.predicate.value === WIKI_NS + 'constructQuery')
    const selectQ = quads.find(q => q.predicate.value === WIKI_NS + 'selectQuery')
    const query = constructQ?.object.value ?? selectQ?.object.value
    const queryKind = constructQ ? 'construct' : selectQ ? 'select' : null
    if (!query || !queryKind) {
      output({
        error: `Affordance ${affordanceName} has no wiki:constructQuery or wiki:selectQuery`,
        affordance: affordanceName,
        descriptorUrl,
      })
      process.exitCode = 1
      return
    }

    let sources: string[]
    let metaCount = 0
    if (options.source && options.source.length > 0) {
      sources = options.source
    } else {
      // Default: discover .meta sidecars under each wiki/ container declared
      // by the affordance — but in v1 we keep it simple: caller passes
      // --source explicitly, otherwise we fall back to the Pod root.
      const metaSources = await discoverMetaSources(root + 'wiki/pages/').catch(() => [])
      sources = [root, ...metaSources]
      metaCount = metaSources.length
    }

    const sparqlOpts = {
      defaultGraphUris: options.defaultGraphUri,
      acceptDatetime: options.acceptDatetime,
    }
    const results = queryKind === 'construct'
      ? await queryQuads(query, sources, sparqlOpts)
      : await querySparql(query, sources, sparqlOpts)

    const doc: Record<string, unknown> = {
      affordance: affordanceName,
      descriptorUrl,
      queryKind,
      query,
      sources,
      metaSources: metaCount,
      results,
    }
    if (options.defaultGraphUri && options.defaultGraphUri.length) {
      doc.defaultGraphUris = options.defaultGraphUri
    }
    if (options.acceptDatetime) doc.acceptDatetime = options.acceptDatetime
    output(doc)
  } catch (err) {
    output({
      error: `Affordance invocation failed: ${(err as Error).message}`,
      affordance: affordanceName,
      descriptorUrl,
    })
    process.exitCode = 1
  }
}
