#!/usr/bin/env node
import { program } from 'commander'
import { info } from './commands/info.js'
import { read } from './commands/read.js'
import { sparql } from './commands/sparql.js'
import { shapes } from './commands/shapes.js'
import { links } from './commands/links.js'
import { types } from './commands/types.js'
import { backlinks } from './commands/backlinks.js'
import { create } from './commands/create.js'
import { patch } from './commands/patch.js'

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
  .description('Execute raw SPARQL via Comunica link-traversal')
  .action(sparql)

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

program.parse()
