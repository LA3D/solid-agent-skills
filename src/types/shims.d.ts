// Neither rdf-ext nor shacl-engine ships TypeScript declarations.
// Minimal shims to satisfy tsc; structural types for Results are in validate.ts.
declare module 'rdf-ext' {
  import type { Quad } from 'n3'
  interface DatasetCore {
    add(quad: Quad): this
    [Symbol.iterator](): Iterator<Quad>
  }
  function dataset(quads?: Iterable<Quad>): DatasetCore
  const rdf: { dataset: typeof dataset }
  export = rdf
}

declare module 'shacl-engine' {
  export class Validator {
    constructor(shapes: unknown, options: { factory: unknown })
    validate(data: { dataset: unknown }): Promise<{
      conforms: boolean
      results: unknown[]
    }>
  }
}
