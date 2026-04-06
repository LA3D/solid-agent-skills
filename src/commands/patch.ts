import { patchResource } from '../lib/http.js'
import { output } from '../lib/jsonld.js'
import { buildN3Patch } from '../lib/n3.js'

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
