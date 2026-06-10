---
name: pod-navigate
description: Navigate, query, and write a Solid Pod used as agentic memory — and judge what you read there before trusting it. Use this skill whenever a task involves answering a question from a Solid Pod's contents, reading a resource and its metadata, deciding whether a stored value is current, or creating/updating resources on a Pod. Triggers on any URL like https://.../vault/..., mentions of a "memory pod", Solid Pod, .meta sidecars, or questions of the form "what does the Pod say about X" / "what is X filed under" / "store this in memory".
---

# Pod Navigation — read, judge, ground, write

A Solid Pod hosting agentic memory describes itself over HTTP. This skill is the
discipline for using one: **orient → drill → ground → audit** — the same move at
every layer, from the Pod root down to a single value. Follow it even when the
answer looks obvious after one fetch; the failure modes below are real and were
measured.

## The two failure modes you must avoid

1. **Confirm-mode over-trust.** Agents find the value the question names, confirm
   it, and stop — while a sibling triple in the SAME metadata says the value is
   contested or superseded. Audited agents catch this; confirming agents miss it
   4:1.
2. **Unknown-term skipping.** Agents treat Pod-minted terms they don't recognize
   as noise and answer from the standard vocabulary alone. The unknown term is
   often exactly the governance signal.

## Disposition 1 — audit before trust

The surface value of a fact in this memory may be out of date. A fact can be
under active revision, or marked as superseded or replaced, by
governance/provenance information attached to the resource. Before you report
any value as authoritative, do NOT simply confirm the first value you find —
actively check the resource's full metadata (its `.meta`, reached via the
`describedby` Link header) and any linked governance, revision, or operation
records for signals that the value is contested, stale, or has been replaced,
and reflect that in your answer. Distinguish **applied** from **proposed**:
an operation with `schema:actionStatus schema:PotentialActionStatus` is a
pending proposal, not an applied correction — report the contestation either
way, and say which it is.

## Disposition 2 — ground unknown terms

This memory describes itself using RDF. Besides the standard vocabularies you
already know (SKOS, Dublin Core, schema.org, PROV, and the like), a resource's
metadata will carry application-specific terms minted by the Pod that you have
NO prior knowledge of — their meaning is defined by the Pod, not by anything in
your training. Do not treat such a term as noise to skip over, and do not guess
its meaning from how its name reads. Before you settle on an answer from a
resource's metadata, identify every term in that metadata that you do not
already recognize — on ANY subject in that metadata, not just the triple that
answers the question — and dereference it (GET its IRI with an RDF Accept
header) to read its own definition (rdfs:comment / skos:definition /
sh:agentInstruction). Only once you understand what each term asserts should
you decide whether it bears on your answer.

## Disposition 3 — declare your write context

When you WRITE to the Pod, you are the only holder of the write-context, and it
is unrecoverable after this session: nobody can later reconstruct why you made
a resource. Before any write, record in the resource's metadata (or body, per
the Pod's authoring grammar): the task that triggered the write, what you
concluded, and why. Do not write a rationale that merely restates the title —
a future agent will audit this context before trusting the resource.

- For **RDF payloads** (Turtle bodies, proposals, `.meta` patches): pre-flight
  locally before writing — `solid-pod validate <data.ttl> --shape <shape-url>`
  (shapes are listed in the Pod's shape catalog). Fix violations, then write.
- For **markdown content**: the Pod validates server-side on write. A `422`
  response carries a ValidationReport with instructions — read it, correct,
  and retry. It is the Pod teaching you its write contract, not a dead end.
- Prefer the Pod's two-stage flow when present: draft into the `working/`
  container (low ceremony), then crystallize to the durable container.

## The walk (recursive: Pod → app → container → resource → value)

1. **Orient.** From ANY resource URL, the `Link` header carries
   `rel="http://www.w3.org/ns/solid/terms#storageDescription"` — GET it. It
   points to the Pod's agent guide (READ IT FIRST when the task is non-trivial),
   JSON-LD context, shape catalog, affordance catalog, and Type Index. Treat URL
   path segments as opaque identifiers; meaning lives in the RDF, not the words
   in the path.
2. **Drill.** Containers list members (`ldp:contains`). Look for an index or
   overview resource (often named `index.md`, conspicuously larger than its
   siblings) and route through it instead of brute-forcing members. The Type
   Index routes class → container. Where the Pod declares applications
   (`interop:Application`, ShapeTree descriptions), read the app's declared
   description to learn ITS access pattern before walking its data.
3. **Ground** (Disposition 2) every unfamiliar term before relying on the data
   around it.
4. **Audit** (Disposition 1) before reporting any value as authoritative.
   To reconstruct how a resource came to be:
   `solid-pod invoke <resource-url> memory-history` (operation announcements,
   newest first) — or follow the resource's `mem:hasOpenAction` /
   `prov:wasGeneratedBy` pointers by hand, and its Memento TimeMap
   (`<resource>?ext=timemap`) for byte-level history.

## Tools, by tier (lower tiers always work)

| Tier | When | How |
|---|---|---|
| HTTP floor | always | `curl` + Accept headers; `.meta` via the `describedby` Link; this whole skill is executable with curl alone |
| `solid-pod` CLI | available in this repo's environment | `read <url>` (FUSED body+metadata in one call — prefer it), `sparql <url> "<query>"` (embedded Comunica; container `.meta` auto-discovery), `affordances <url>` (list what the Pod offers), `invoke <resource-url> <name>`, `validate <data> --shape <url>`, `wiki-search <container> <terms>` |

Report what you learned FROM THE POD separately from what you knew from
training, and say which resource each claim came from.
