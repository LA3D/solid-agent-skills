# PROPOSAL (recommendation only) — fix `solid-pod invoke` namespace mismatch

This is a pre-existing CLI bug, technically outside the contact-descriptor audit, but it
blocks the value of every fix above: with it present, NO affordance invokes successfully.

## Defect

`solid-agent-skills/src/commands/invoke.ts:9`:

```ts
const WIKI_NS = 'https://pod.vardeman.me:3000/vault/ontology/wiki#'   // note :3000
```

Lines 44–45 match descriptor predicates against `WIKI_NS + 'constructQuery'` /
`WIKI_NS + 'selectQuery'`. But every live descriptor on the Pod uses the **port-less**
namespace `https://pod.vardeman.me/vault/ontology/wiki#` (confirmed against
`wiki-search-grep.ttl`, `hub-view.ttl`, `link.ttl`, and all 7 contact/org descriptors, and
against the ontology doc at `/vault/ontology/wiki`). The port-ful constant never matches.

Empirical:
```
$ solid-pod invoke https://pod.vardeman.me/vault/ contact-find-by-name
{ "error": "Affordance contact-find-by-name has no wiki:constructQuery or wiki:selectQuery" }
$ solid-pod invoke https://pod.vardeman.me/vault/ hub-view
{ "error": "Affordance hub-view has no wiki:constructQuery or wiki:selectQuery" }
```

Both descriptors DO carry the predicate; the mismatch is the `:3000` port. This also
violates D84 (port-less HTTPS URI conformance).

## Proposed fix (one line)

```ts
const WIKI_NS = 'https://pod.vardeman.me/vault/ontology/wiki#'
```

## Note for the descriptor proposals

There is also a `$variable`-substitution question for `wiki:selectQuery`: the contact
descriptors use SPARQL `$name` / `$orcid` syntax (a parameter convention), but `invoke.ts`
currently passes the query string verbatim to Comunica with no binding substitution. The
machine-readable `wiki:queryParameter` blocks added in the descriptor proposals give the
CLI the schema it needs to bind these. Implementing the binding step in `invoke.ts` is a
follow-up beyond this audit; flagged here so the descriptor metadata and the CLI evolve
together.
