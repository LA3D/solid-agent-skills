#!/usr/bin/env node
import { program } from 'commander'
import { info } from './commands/info.js'
import { read } from './commands/read.js'
import { sparql, SparqlOptions } from './commands/sparql.js'
import { invoke, InvokeOptions } from './commands/invoke.js'
import { shapes } from './commands/shapes.js'
import { links } from './commands/links.js'
import { types } from './commands/types.js'
import { backlinks } from './commands/backlinks.js'
import { create } from './commands/create.js'
import { patch } from './commands/patch.js'
import { search } from './commands/search.js'
import { properties } from './commands/properties.js'
import { wikiSearch, WikiSearchOptions } from './commands/wikiSearch.js'
import { validate, ValidateOptions } from './commands/validate.js'

// Commander variadic-flag collector: each --flag <value> appends to the list.
function collectRepeating(value: string, previous: string[] = []): string[] {
  return [...previous, value]
}

program
  .name('solid-pod')
  .description('Agent-first CLI for Solid Pod interaction')
  .version('0.1.0')

program
  .command('info <url>')
  .description('GET .well-known/solid, return VoID/DCAT as JSON-LD')
  .action(info)

program
  .command('read <url>')
  .description('GET resource with Link headers and .meta sidecar as JSON-LD')
  .action(read)

program
  .command('sparql <url> <query>')
  .description('Execute SPARQL via embedded Comunica (auto-discovers .meta sources for containers)')
  .option('--no-meta', 'Skip .meta auto-discovery')
  .option('--source <url>', 'Explicit Comunica source (repeatable); short-circuits .meta auto-discovery', collectRepeating, [])
  .option('--default-graph-uri <url>', 'SPARQL Protocol default-graph-uri (repeatable); RQ-Pod-4 workaround', collectRepeating, [])
  .option('--accept-datetime <rfc1123>', 'RFC 7089 Accept-Datetime for Memento time-travel')
  .action((url: string, query: string, opts: SparqlOptions) => sparql(url, query, opts))

program
  .command('invoke <resource-url> <affordance>')
  .description("Invoke a resource-scoped affordance: catalog discovered via the resource's storageDescription; %RESOURCE% substituted")
  .option('--pod <url>', 'Pod root override (skips storage-description discovery)')
  .option('--source <url>', 'Explicit Comunica source (repeatable)', collectRepeating, [])
  .option('--default-graph-uri <url>', 'SPARQL Protocol default-graph-uri (repeatable)', collectRepeating, [])
  .option('--accept-datetime <rfc1123>', 'RFC 7089 Accept-Datetime for Memento time-travel')
  .action((url: string, affordance: string, opts: InvokeOptions) => invoke(url, affordance, opts))

program
  .command('shapes <url>')
  .description('List SHACL shapes with sh:agentInstruction guidance')
  .action(shapes)

program
  .command('links <url>')
  .description('Show outgoing references from .meta')
  .action(links)

program
  .command('types <url>')
  .description('Browse rdf:type values with counts')
  .action(types)

program
  .command('backlinks <url>')
  .description('Find resources linking to this URL')
  .option('--source <url>', 'Pod or container URL to search in')
  .action(backlinks)

program
  .command('create <container-url>')
  .description('Create a new resource in a container')
  .requiredOption('--slug <name>', 'Resource filename')
  .option('--content-type <type>', 'Content type', 'text/markdown')
  .option('--body <text>', 'Resource body content')
  .option('--meta <triples>', 'N3 triples to insert into .meta')
  .action(create)

program
  .command('patch <url>')
  .description('Patch a .meta resource with N3 insert')
  .requiredOption('--insert <triples>', 'N3 triples to insert')
  .action(patch)

program
  .command('search <url> <terms>')
  .description('Search container .meta files by text (client-side, OSLC when available)')
  .option('--source <url>', 'Explicit .meta URL to search (replaces auto-discovery)')
  .action(search)

program
  .command('properties <url>')
  .description('Show predicate usage statistics from container .meta files')
  .option('--source <url>', 'Explicit source URL')
  .action(properties)

program
  .command('validate <data>')
  .description('SHACL pre-flight: validate RDF data (URL or file) against a shape (URL or file) before writing')
  .requiredOption('--shape <shape>', 'SHACL shape document (URL or file)')
  .action((data: string, opts: ValidateOptions) => validate(data, opts))

program
  .command('wiki-search <container-url> [terms...]')
  .description('Recursive literal-substring AND-search over wiki-memory markdown pages (Phase 7a, D87)')
  .option('--page-size <n>', 'Max results per page (default 25, max 100)')
  .option('--start-index <n>', '0-based result offset (default 0)')
  .action((url: string, terms: string[], opts: WikiSearchOptions) => wikiSearch(url, terms, opts))

program.parse()
