import { fetchResource } from '../lib/http.js'
import { turtleToJsonld, output } from '../lib/jsonld.js'

export async function info(url: string): Promise<void> {
  const base = url.endsWith('/') ? url : url + '/'
  const wellKnown = new URL('.well-known/solid', base).href

  const res = await fetchResource(wellKnown, 'text/turtle')
  if (res.status !== 200) {
    output({ error: `Failed to fetch ${wellKnown}`, status: res.status })
    process.exitCode = 1
    return
  }

  const compacted = await turtleToJsonld(res.body, wellKnown)

  if (Object.keys(res.headers).length > 0) {
    compacted.affordances = res.headers
  }

  output(compacted)
}
