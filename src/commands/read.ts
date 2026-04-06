import { fetchResource } from '../lib/http.js'
import { turtleToJsonld, output } from '../lib/jsonld.js'

export async function read(url: string): Promise<void> {
  const res = await fetchResource(url)
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${url}`, status: res.status })
    process.exitCode = 1
    return
  }

  const result: Record<string, unknown> = {
    '@id': url,
    'dct:format': res.contentType,
    content: res.body,
    affordances: res.headers,
  }

  // If describedby link exists, fetch .meta and include as JSON-LD
  if (res.headers.describedby) {
    const metaUrl = new URL(res.headers.describedby as string, url).href
    const metaRes = await fetchResource(metaUrl, 'text/turtle')
    if (metaRes.status === 200) {
      result.meta = await turtleToJsonld(metaRes.body, metaUrl)
    }
  }

  output(result)
}
