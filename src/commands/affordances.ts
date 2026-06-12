import { output } from '../lib/jsonld.js'
import { discoverAffordanceCatalog, listAffordanceNames } from './invoke.js'

export interface AffordancesOptions { pod?: string }

/** List the Pod's affordance catalog by name, discoverable from any resource URL. */
export async function affordances(url: string, options: AffordancesOptions = {}): Promise<void> {
  try {
    const catalog = await discoverAffordanceCatalog(url, options.pod)
    if (!catalog) {
      output({ error: `No affordance catalog discoverable from ${url} (try --pod <root>)` })
      process.exitCode = 1
      return
    }
    output({
      catalog,
      affordances: await listAffordanceNames(catalog),
      usage: 'solid-pod invoke <resource-url> <affordance-name> (query-bearing affordances; others carry navigation instructions — read the descriptor)',
    })
  } catch (err) {
    output({ error: `Affordance listing failed: ${(err as Error).message}` })
    process.exitCode = 1
  }
}
