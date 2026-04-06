export function buildN3Patch(triples: string): string {
  return `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts {
    ${triples}
}.`
}
