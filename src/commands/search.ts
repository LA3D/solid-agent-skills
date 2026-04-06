import { fetchResource, discoverMetaSources } from '../lib/http.js'
import { output } from '../lib/jsonld.js'
import { SOLID_CONTEXT } from '../lib/context.js'
import N3 from 'n3'

interface SearchResult {
  resource: string
  label: string
  matchedPredicate: string
  matchedValue: string
}

/** Fetch a .meta file, parse it, and return quads matching the search regex. */
async function searchMeta(
  metaUrl: string,
  pattern: RegExp,
): Promise<SearchResult[]> {
  try {
    const res = await fetchResource(metaUrl, 'text/turtle')
    if (res.status !== 200) return []

    const quads = new N3.Parser({ baseIRI: metaUrl }).parse(res.body)
    const results: SearchResult[] = []

    // .meta URL = resourceUrl + '.meta', so strip to get subject
    const resourceUrl = metaUrl.replace(/\.meta$/, '')

    // Collect label for the resource
    const labelPredicates = [
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://www.w3.org/2000/01/rdf-schema#label',
      'http://purl.org/dc/terms/title',
    ]
    let label = resourceUrl
    for (const lp of labelPredicates) {
      const found = quads.find(q => q.predicate.value === lp)
      if (found) { label = found.object.value; break }
    }

    // Search all literal values for the pattern
    for (const q of quads) {
      if (q.object.termType === 'Literal' && pattern.test(q.object.value)) {
        results.push({
          resource: resourceUrl,
          label,
          matchedPredicate: q.predicate.value,
          matchedValue: q.object.value,
        })
      }
    }

    return results
  } catch {
    return []
  }
}

export async function search(
  url: string,
  terms: string,
  options: { source?: string } = {},
): Promise<void> {
  const containerUrl = url.endsWith('/') ? url : url + '/'

  // Direct .meta fetch + in-process search (avoids Comunica overhead).
  // OSLC Query will be method: 'oslc' when pod advertises support.
  try {
    const metaSources = options.source
      ? [options.source]
      : await discoverMetaSources(containerUrl)
    if (metaSources.length === 0) {
      output({ '@context': SOLID_CONTEXT, source: containerUrl, terms, method: 'client', results: [] })
      return
    }

    const escaped = terms.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(escaped, 'i')

    // Fetch all .meta in parallel batches of 20
    const batchSize = 20
    const allResults: SearchResult[] = []
    for (let i = 0; i < metaSources.length; i += batchSize) {
      const batch = metaSources.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(ms => searchMeta(ms, pattern)),
      )
      allResults.push(...batchResults.flat())
    }

    // Deduplicate by resource + predicate
    const seen = new Set<string>()
    const results = allResults.filter(r => {
      const key = `${r.resource}|${r.matchedPredicate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    output({ '@context': SOLID_CONTEXT, source: containerUrl, terms, method: 'client', metaSources: metaSources.length, results })
  } catch (err) {
    output({
      error: `Search failed: ${(err as Error).message}`,
      source: containerUrl,
      terms,
    })
    process.exitCode = 1
  }
}
