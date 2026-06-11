import N3 from 'n3'
import { fetchResource, discoverStorageDescription, listContainerResources, discoverQuerySources } from '../lib/http.js'
import { querySparql, queryQuads } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export interface InvokeOptions {
  pod?: string
  source?: string[]
  param?: string[]
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

/** Escape special regex metacharacters in a literal string. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Substitute SPARQL named parameters ($name) with their values.
 * Word-boundary matching ensures $org does not clobber $organization.
 * Values are used verbatim — the caller supplies the SPARQL form:
 *   IRI as <...>  or  literal as "..."
 */
export function substituteParams(query: string, params: Record<string, string>): string {
  let result = query
  for (const [name, value] of Object.entries(params)) {
    // replacer FUNCTION (not string) so $&/$1/$$ in the value are inserted verbatim, not interpreted
    result = result.replace(new RegExp('\\$' + escapeRegExp(name) + '\\b', 'g'), () => value)
  }
  return result
}

/** Parse --param name=value strings into a Record. Values containing '=' are preserved. */
export function parseParams(paramStrings: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of paramStrings) {
    const eq = s.indexOf('=')
    if (eq === -1) continue
    out[s.slice(0, eq)] = s.slice(eq + 1)
  }
  return out
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

    // Apply substitutions: %RESOURCE% first (resource-scoped), then $param (parameter-scoped).
    // Both can coexist in a single query; substituteParams is a no-op when params is empty.
    const rawTemplate = extracted.query
    let query = substituteResource(rawTemplate, resourceUrl)
    const params = parseParams(options.param ?? [])
    if (Object.keys(params).length > 0) {
      query = substituteParams(query, params)
    }

    let sources: string[]
    let metaCount = 0
    if (options.source && options.source.length > 0) {
      // Explicit --source always wins.
      sources = options.source
    } else if (rawTemplate.includes('%RESOURCE%')) {
      // Resource-scoped affordance (e.g. memory-history): query the wiki-memory
      // .operations/ container where as:object operation announcements live.
      // This default is wiki-memory-overlay-specific; non-wiki affordances should
      // pass --source to override.
      // RQ-Pod-4: Comunica link-traversal skips describedby on non-RDF resources;
      // enumerating members adds them as named-graph sources.
      // resource.meta is intentionally omitted — it causes link-traversal to fan
      // out across the entire graph and times out on complex SPARQL patterns.
      const root = catalog.replace(/meta\/affordances\/$/, '')
      const opsContainer = `${root}wiki/.operations/`
      const opsSources = await listContainerResources(opsContainer).catch(() => [])
      sources = opsSources.length > 0 ? opsSources : [opsContainer]
      metaCount = opsSources.length
    } else {
      // Parameter-scoped affordance (e.g. contact-find-by-orcid): default to the
      // container that contains the resource arg, resolved via discoverQuerySources
      // (content-type-driven: RDF body for .ttl contacts, .meta for .md notes).
      // This gives the affordance the right data sources without requiring --source.
      const container = resourceUrl.endsWith('/')
        ? resourceUrl
        : resourceUrl.slice(0, resourceUrl.lastIndexOf('/') + 1)
      const containerSources = await discoverQuerySources(container).catch(() => [])
      sources = containerSources.length > 0 ? containerSources : [container]
      metaCount = containerSources.length
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
    if (Object.keys(params).length > 0) doc.params = params
    output(doc)
  } catch (err) {
    output({ error: `Affordance invocation failed: ${(err as Error).message}`, affordance: affordanceName })
    process.exitCode = 1
  }
}
