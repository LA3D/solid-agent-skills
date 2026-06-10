import { readFileSync } from 'node:fs'
import N3 from 'n3'
import rdf from 'rdf-ext'
import { Validator } from 'shacl-engine'
import { fetchResource } from '../lib/http.js'
import { output } from '../lib/jsonld.js'

export interface ValidateOptions { shape: string }

async function loadDataset(src: string): Promise<ReturnType<typeof rdf.dataset>> {
  const isUrl = src.startsWith('http://') || src.startsWith('https://')
  let body: string
  if (isUrl) {
    const res = await fetchResource(src, 'text/turtle')
    if (res.status !== 200) throw new Error(`GET ${src} returned HTTP ${res.status}`)
    body = res.body
  } else {
    body = readFileSync(src, 'utf8')
  }
  const quads = new N3.Parser({ baseIRI: isUrl ? src : `file://${src}` }).parse(body)
  return rdf.dataset(quads)
}

// Extract the path IRI from a shacl-engine path array.
// For a simple predicate path (quantifier='one', single predicate), return the IRI string.
// For complex paths (inverse, sequence, etc.) return the first predicate IRI as a best-effort.
// Returns null if no path is present.
function extractPath(path: unknown): string | null {
  if (!path || !Array.isArray(path) || path.length === 0) return null
  const step = path[0] as { predicates?: Array<{ value: string }> }
  return step.predicates?.[0]?.value ?? null
}

// Return the shape IRI string for a named node, null for blank nodes or absent shapes.
// Blank-node IDs (e.g. "n3-0") are internal to the engine and meaningless to consumers.
function extractSourceShape(shape: ShaclResult['shape']): string | null {
  const term = shape?.ptr?.term
  if (!term || term.termType !== 'NamedNode') return null
  return term.value
}

// Minimal structural type for shacl-engine Result objects (no published .d.ts)
interface ShaclResult {
  focusNode?: { term: { value: string; termType: string } }
  path?: Array<{ predicates?: Array<{ value: string }> }>
  severity?: { value: string }
  shape?: { ptr?: { term?: { value: string; termType: string } } }
  message?: Array<{ value: string }>
}

/**
 * SHACL pre-flight (spec §6.1 station 2): validate RDF data against a shape
 * BEFORE writing it to the Pod. Uses shacl-engine (rdf-ext), which pairs
 * cleanly with rdf-ext v2. A local pass predicts a floor pass for SHACL-core
 * shapes; the server admission-floor migration to shacl-engine is a separate
 * future task. Data and shape each accept a URL or a local file path.
 */
export async function validate(dataSrc: string, options: ValidateOptions): Promise<void> {
  try {
    const [dataDataset, shapesDataset] = await Promise.all([
      loadDataset(dataSrc),
      loadDataset(options.shape),
    ])
    const validator = new Validator(shapesDataset, { factory: rdf })
    const report = await validator.validate({ dataset: dataDataset })
    output({
      conforms: report.conforms,
      data: dataSrc,
      shape: options.shape,
      results: (report.results as ShaclResult[]).map((r) => ({
        focusNode: r.focusNode?.term.value ?? null,
        path: extractPath(r.path),
        severity: r.severity?.value ?? null,
        sourceShape: extractSourceShape(r.shape),
        message: (r.message ?? []).map((m: { value: string }) => m.value),
      })),
    })
    if (!report.conforms) process.exitCode = 1
  } catch (err) {
    output({ error: `Validation failed: ${(err as Error).message}`, data: dataSrc, shape: options.shape })
    process.exitCode = 1
  }
}
