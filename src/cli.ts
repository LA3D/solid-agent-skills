#!/usr/bin/env node
import { program } from 'commander'
import { info } from './commands/info.js'
import { read } from './commands/read.js'
import { sparql } from './commands/sparql.js'
import { shapes } from './commands/shapes.js'

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

program.parse()
