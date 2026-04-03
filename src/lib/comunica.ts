import { QueryEngine } from '@comunica/query-sparql-link-traversal'

export interface SparqlBinding {
  [variable: string]: { type: string; value: string }
}

let engine: QueryEngine | null = null

function getEngine(): QueryEngine {
  if (!engine) engine = new QueryEngine()
  return engine
}

export async function querySparql(
  query: string,
  sources: string[],
): Promise<SparqlBinding[]> {
  const eng = getEngine()
  const stream = await eng.queryBindings(query, {
    sources: sources,
    lenient: true,
  })
  const bindings = await stream.toArray()

  return bindings.map(binding => {
    const row: SparqlBinding = {}
    for (const [variable, term] of binding) {
      row[variable.value] = { type: term.termType, value: term.value }
    }
    return row
  })
}
