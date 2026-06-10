import N3 from 'n3'
import { fetchResource, discoverStorageDescription, listContainerResources } from '../lib/http.js'
import { querySparql, queryQuads } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export interface InvokeOptions {
  pod?: string
  source?: string[]
  defaultGraphUri?: string[]
  acceptDatetime?: string
}

// Match descriptor predicates by localName: post-D107 descriptors use sub:,
// pre-D107 ones use wiki: — both namespaces end with #selectQuery / #constructQuery.
const byLocalName = (quads: N3.Quad[], local: string) =>
  quads.find(q => q.predicate.value.endsWith('#' + local))

export function extractAffordanceQuery(quads: N3.Quad[]): { query: string; kind: 'construct' | 'select' } | null {
  const c = byLocalName(quads, 'constructQuery')
  if (c) return { query: c.object.value, kind: 'construct' }
  const s = byLocalName(quads, 'selectQuery')
  if (s) return { query: s.object.value, kind: 'select' }
  return null
}

export function substituteResource(query: string, resourceUrl: string): string {
  return query.replaceAll('%RESOURCE%', resourceUrl)
}

/** Resolve the affordance catalog from a RESOURCE url via its storage description (D44/D52). */
export async function discoverAffordanceCatalog(resourceUrl: string, pod?: string): Promise<string | null> {
  if (pod) {
    const root = pod.endsWith('/') ? pod : pod + '/'
    return `${root}meta/affordances/`
  }
  const sdUrl = await discoverStorageDescription(resourceUrl)
  if (!sdUrl) return null
  const sd = await fetchResource(sdUrl, 'text/turtle')
  if (sd.status !== 200) return null
  const quads = new N3.Parser({ baseIRI: sdUrl }).parse(sd.body)
  const cat = byLocalName(quads, 'affordanceCatalog')
  return cat ? cat.object.value : null
}

export async function listAffordanceNames(catalogUrl: string): Promise<string[]> {
  const members = await listContainerResources(catalogUrl)
  return members.map(u => u.split('/').pop()!.replace(/\.ttl$/, ''))
}

/**
 * Invoke a resource-scoped affordance: arg 1 is the RESOURCE the affordance
 * operates on (same contract as `read`/`sparql`), not the Pod root. The
 * catalog is discovered from the resource's storageDescription Link header
 * (or --pod). The descriptor's query has %RESOURCE% substituted with the
 * resource IRI before execution (D52 Tier-2).
 */
export async function invoke(
  resourceUrl: string,
  affordanceName: string,
  options: InvokeOptions = {},
): Promise<void> {
  try {
    const catalog = await discoverAffordanceCatalog(resourceUrl, options.pod)
    if (!catalog) {
      output({ error: `No affordance catalog discoverable from ${resourceUrl} (no storageDescription Link; try --pod <root>)` })
      process.exitCode = 1
      return
    }
    const descriptorUrl = `${catalog}${affordanceName}.ttl`
    const res = await fetchResource(descriptorUrl, 'text/turtle')
    if (res.status !== 200) {
      output({
        error: `Affordance ${affordanceName} not found at ${descriptorUrl}: HTTP ${res.status}`,
        available: await listAffordanceNames(catalog),
      })
      process.exitCode = 1
      return
    }

    const quads = new N3.Parser({ baseIRI: descriptorUrl }).parse(res.body)
    const extracted = extractAffordanceQuery(quads)
    if (!extracted) {
      output({ error: `Affordance ${affordanceName} has no selectQuery or constructQuery`, descriptorUrl })
      process.exitCode = 1
      return
    }
    const query = substituteResource(extracted.query, resourceUrl)

    let sources: string[]
    let metaCount = 0
    if (options.source && options.source.length > 0) {
      sources = options.source
    } else {
      // Default sources: the wiki-memory .operations/ container (where as:object
      // operation announcements live). This path is wiki-memory-overlay-specific;
      // non-wiki affordances MUST pass --source to override.
      // RQ-Pod-4: Comunica link-traversal skips describedby on non-RDF resources;
      // enumerating members adds them as named-graph sources.
      // resource.meta is intentionally omitted from defaults — it causes link-traversal
      // to fan out across the entire graph and times out on complex SPARQL patterns.
      const root = catalog.replace(/meta\/affordances\/$/, '')
      const opsContainer = `${root}wiki/.operations/`
      const opsSources = await listContainerResources(opsContainer).catch(() => [])
      sources = opsSources.length > 0 ? opsSources : [opsContainer]
      metaCount = opsSources.length
    }

    const results = extracted.kind === 'construct'
      ? await queryQuads(query, sources, {
          defaultGraphUris: options.defaultGraphUri,
          acceptDatetime: options.acceptDatetime,
        })
      : await querySparql(query, sources, {
          defaultGraphUris: options.defaultGraphUri,
          acceptDatetime: options.acceptDatetime,
        })

    const doc: Record<string, unknown> = {
      affordance: affordanceName,
      resource: resourceUrl,
      descriptorUrl,
      queryKind: extracted.kind,
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
    output({ error: `Affordance invocation failed: ${(err as Error).message}`, affordance: affordanceName })
    process.exitCode = 1
  }
}
