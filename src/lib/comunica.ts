import { QueryEngine } from '@comunica/query-sparql-link-traversal'

export interface SparqlBinding {
  [variable: string]: { type: string; value: string }
}

export interface SparqlOpts {
  // Extra Comunica sources appended to `sources` (RQ-Pod-4: each `.meta` URL
  // becomes its own source so Comunica reads it as a named graph).
  defaultGraphUris?: string[]
  // RFC 7089 Accept-Datetime — injected on every HTTP fetch Comunica issues.
  acceptDatetime?: string
}

let engine: QueryEngine | null = null

function getEngine(): QueryEngine {
  if (!engine) engine = new QueryEngine()
  return engine
}

function buildFetch(acceptDatetime?: string): typeof fetch {
  if (!acceptDatetime) return fetch
  return (input, init) => {
    const headers = new Headers(init?.headers ?? {})
    if (!headers.has('Accept-Datetime')) headers.set('Accept-Datetime', acceptDatetime)
    return fetch(input, { ...init, headers })
  }
}

export async function querySparql(
  query: string,
  sources: string[],
  opts: SparqlOpts = {},
): Promise<SparqlBinding[]> {
  const eng = getEngine()
  // Comunica doesn't expose a direct default-graph-uri context key; treating
  // each default graph as an additional source preserves SPARQL Protocol
  // semantics on a link-traversal engine and dovetails with the .meta-as-source
  // workaround for RQ-Pod-4.
  const allSources = opts.defaultGraphUris && opts.defaultGraphUris.length
    ? [...sources, ...opts.defaultGraphUris]
    : sources
  const context: Record<string, unknown> = {
    sources: allSources,
    lenient: true,
  }
  if (opts.acceptDatetime) context.fetch = buildFetch(opts.acceptDatetime)

  const stream = await eng.queryBindings(query, context as Parameters<typeof eng.queryBindings>[1])
  const bindings = await stream.toArray()

  return bindings.map(binding => {
    const row: SparqlBinding = {}
    for (const [variable, term] of binding) {
      row[variable.value] = { type: term.termType, value: term.value }
    }
    return row
  })
}

/** CONSTRUCT/DESCRIBE quad stream — used by `invoke` to run affordance CONSTRUCTs. */
export async function queryQuads(
  query: string,
  sources: string[],
  opts: SparqlOpts = {},
): Promise<Array<{ s: string; p: string; o: string; g: string }>> {
  const eng = getEngine()
  const allSources = opts.defaultGraphUris && opts.defaultGraphUris.length
    ? [...sources, ...opts.defaultGraphUris]
    : sources
  const context: Record<string, unknown> = { sources: allSources, lenient: true }
  if (opts.acceptDatetime) context.fetch = buildFetch(opts.acceptDatetime)
  const stream = await eng.queryQuads(query, context as Parameters<typeof eng.queryQuads>[1])
  const quads = await stream.toArray()
  return quads.map(q => ({
    s: q.subject.value, p: q.predicate.value, o: q.object.value, g: q.graph.value,
  }))
}
