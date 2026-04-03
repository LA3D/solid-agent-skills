import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function sparql(url: string, query: string): Promise<void> {
  try {
    const bindings = await querySparql(query, [url])
    output({
      source: url,
      query,
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
