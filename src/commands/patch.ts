import { patchResource } from '../lib/http.js'
import { output } from '../lib/jsonld.js'

function buildN3Patch(triples: string): string {
  return `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts {
    ${triples}
}.`
}

export async function patch(
  url: string,
  opts: { insert: string },
): Promise<void> {
  const n3patch = buildN3Patch(opts.insert)
  const res = await patchResource(url, n3patch)

  if (res.status >= 400) {
    output({ error: `PATCH failed for ${url}`, status: res.status, body: res.body })
    process.exitCode = 1
    return
  }

  output({
    '@id': url,
    status: 'patched',
    inserted: opts.insert,
  })
}
