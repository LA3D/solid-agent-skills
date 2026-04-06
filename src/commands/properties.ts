import { fetchResource, discoverMetaSources } from '../lib/http.js'
import { output } from '../lib/jsonld.js'
import { SOLID_CONTEXT } from '../lib/context.js'
import N3 from 'n3'

interface PropertyStat {
  predicate: string
  count: number
}

/** Fetch a .meta file and return all predicate URIs found. */
export async function collectPredicates(metaUrl: string): Promise<string[]> {
  try {
    const res = await fetchResource(metaUrl, 'text/turtle')
    if (res.status !== 200) return []
    const quads = new N3.Parser({ baseIRI: metaUrl }).parse(res.body)
    return quads.map(q => q.predicate.value)
  } catch {
    return []
  }
}

export async function properties(
  url: string,
  options: { source?: string } = {},
): Promise<void> {
  const containerUrl = url.endsWith('/') ? url : url + '/'

  try {
    const metaSources = options.source
      ? [options.source]
      : await discoverMetaSources(containerUrl)
    if (metaSources.length === 0) {
      output({ '@context': SOLID_CONTEXT, source: containerUrl, metaSources: 0, properties: [] })
      return
    }

    // Fetch all .meta in parallel batches of 20
    const batchSize = 20
    const counts = new Map<string, number>()

    for (let i = 0; i < metaSources.length; i += batchSize) {
      const batch = metaSources.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(ms => collectPredicates(ms)),
      )
      for (const predicates of batchResults) {
        for (const p of predicates) {
          counts.set(p, (counts.get(p) || 0) + 1)
        }
      }
    }

    // Sort by count descending
    const props: PropertyStat[] = Array.from(counts.entries())
      .map(([predicate, count]) => ({ predicate, count }))
      .sort((a, b) => b.count - a.count)

    output({ '@context': SOLID_CONTEXT, source: containerUrl, metaSources: metaSources.length, properties: props })
  } catch (err) {
    output({
      error: `Properties failed: ${(err as Error).message}`,
      source: containerUrl,
    })
    process.exitCode = 1
  }
}
