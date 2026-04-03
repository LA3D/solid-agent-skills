import { querySparql } from '../lib/comunica.js'
import { output } from '../lib/jsonld.js'

export async function types(url: string): Promise<void> {
  const query = `
    SELECT ?type (COUNT(?s) AS ?count)
    WHERE { ?s a ?type }
    GROUP BY ?type
    ORDER BY DESC(?count)
  `
  try {
    const bindings = await querySparql(query, [url])
    const types = bindings.map(b => ({
      type: b.type.value,
      count: parseInt(b.count.value, 10),
    }))
    output({ source: url, types })
  } catch (err) {
    output({
      error: `Types query failed: ${(err as Error).message}`,
      source: url,
    })
    process.exitCode = 1
  }
}
