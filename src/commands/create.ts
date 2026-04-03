import { putResource, patchResource, fetchResource } from '../lib/http.js'
import { output } from '../lib/jsonld.js'

function buildN3Patch(triples: string): string {
  return `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> a solid:InsertDeletePatch;
solid:inserts {
    ${triples}
}.`
}

export async function create(
  containerUrl: string,
  opts: { slug: string; contentType: string; body?: string; meta?: string },
): Promise<void> {
  // Ensure container URL ends with /
  const ctr = containerUrl.endsWith('/') ? containerUrl : containerUrl + '/'
  const resourceUrl = new URL(opts.slug, ctr).href

  // Read body from stdin if not provided
  let body = opts.body ?? ''
  if (!opts.body && !process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    body = Buffer.concat(chunks).toString('utf8')
  }

  const res = await putResource(resourceUrl, body, opts.contentType)
  if (res.status >= 400) {
    output({ error: `PUT failed for ${resourceUrl}`, status: res.status, body: res.body })
    process.exitCode = 1
    return
  }

  const result: Record<string, unknown> = {
    '@id': resourceUrl,
    status: 'created',
    contentType: opts.contentType,
    affordances: res.headers,
    metaPatched: false,
  }

  // Patch .meta if --meta triples provided
  if (opts.meta) {
    const metaUrl = resourceUrl + '.meta'
    const patch = buildN3Patch(opts.meta)
    const patchRes = await patchResource(metaUrl, patch)
    if (patchRes.status >= 400) {
      output({ error: `PATCH .meta failed for ${metaUrl}`, status: patchRes.status, body: patchRes.body })
      process.exitCode = 1
      return
    }
    result.metaPatched = true
  }

  output(result)
}
