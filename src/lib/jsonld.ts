import jsonld from 'jsonld'
import { SOLID_CONTEXT } from './context.js'

export async function compactOutput(doc: object): Promise<Record<string, unknown>> {
  return await jsonld.compact(doc, SOLID_CONTEXT) as Record<string, unknown>
}

export function output(doc: unknown): void {
  console.log(JSON.stringify(doc, null, 2))
}
