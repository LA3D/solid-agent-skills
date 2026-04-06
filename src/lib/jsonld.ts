import jsonld from 'jsonld'
import N3 from 'n3'
import { SOLID_CONTEXT } from './context.js'

export async function compactOutput(doc: object): Promise<Record<string, unknown>> {
  return await jsonld.compact(doc, SOLID_CONTEXT) as Record<string, unknown>
}

export async function turtleToJsonld(turtle: string, baseIRI: string): Promise<Record<string, unknown>> {
  const quads = new N3.Parser({ baseIRI }).parse(turtle)
  const writer = new N3.Writer({ format: 'application/n-quads' })
  quads.forEach(q => writer.addQuad(q))
  const nquads = await new Promise<string>((resolve, reject) => {
    writer.end((err, r) => err ? reject(err) : resolve(r))
  })
  const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })
  return await compactOutput(expanded.length === 1 ? expanded[0] : expanded)
}

export function output(doc: unknown): void {
  console.log(JSON.stringify(doc, null, 2))
}
