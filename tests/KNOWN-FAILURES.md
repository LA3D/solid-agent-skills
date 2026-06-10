# Known test failures (pinned baseline)

Pinned 2026-06-10 against a fresh Pod (`cogitarelink-solid` `make reset`), confirmed
across 3 runs (`SOLID_POD_URL=https://pod.vardeman.me/vault/ npx vitest run`). These are
**pre-existing legacy-suite drift**, not caused by the SP1 `pod-navigate` work
(agentic progressive-disclosure contract, spec in
`cogitarelink-solid/docs/superpowers/specs/2026-06-10-agentic-progressive-disclosure-contract-design.md`).

**Gate rule:** a suite run is a regression only if a test fails that is **not** in
either list below. Failures listed here are expected until the underlying command is
rebuilt or retired (see the mid-rebuild agenda: `docs/research/2026-06-03-pod-skill-acquisition.md`).
Re-establish the baseline with a fresh `make reset` + 3 runs if the live Pod's seed
content changes.

## Deterministic (fail every fresh-Pod run, n=3)

These assert the pre-D107 Pod layout / seeded content; the *commands the `pod-navigate`
skill relies on* (`read`, `sparql`, `affordances`, `invoke`, `validate`, `wiki-search`)
are verified healthy — it's the legacy *tests* that hold stale expectations.

1. `tests/commands/invoke.test.ts > solid-pod invoke > extracts breadcrumb-view SELECT query (placeholder substitution out of scope)`
2. `tests/commands/invoke.test.ts > solid-pod invoke > fetches hub-view affordance and runs its CONSTRUCT`
3. `tests/commands/search.test.ts > solid-pod search > finds resources matching search terms`
4. `tests/commands/shapes.test.ts > solid-pod shapes > includes sh:agentInstruction in shape output`
5. `tests/commands/shapes.test.ts > solid-pod shapes > lists SHACL shapes from the shapes container`
6. `tests/e2e/workflow.test.ts > end-to-end: discover → browse → query → create > Step 2: find shapes with sh:agentInstruction`
7. `tests/e2e/workflow.test.ts > end-to-end: discover → browse → query → create > Step 5: search for a concept`

**(1)–(2) close during SP1**: Task 2 rewrites `tests/commands/invoke.test.ts` for the
resource-scoped contract. After SP1 the deterministic-drift set should be (3)–(7) = 5.

**(4)–(6) `shapes` root cause is substrate-side, not a CLI bug**: the live shape catalog
holds a template-placeholder file containing `<[YOUR VOCABULARY IRI]>`, which makes the
`shapes` command throw an N3 parse error. Tracked in `cogitarelink-solid` FOLLOWUPS
(the `make audit` template-placeholder item). It also trips a cold agent's `validate`
path, so it is a real (small) candidate to fix at the SP2 catalog re-cut: relocate the
template out of the *served* catalog.

## Flaky / intermittent (observed failing in 1 of 3 fresh-Pod runs)

The `.meta`-traversal / SPARQL query tests — timing- and order-sensitive (RQ-Pod-4
describedby-skip territory). Not a reliable signal in either direction; do not treat a
pass *or* a fail of these as meaningful.

- `tests/commands/links.test.ts > solid-pod links > returns outgoing links from a container .meta`
- `tests/commands/properties.test.ts > solid-pod properties > returns predicate usage counts for a container`
- `tests/commands/properties.test.ts > solid-pod properties > includes common predicates (skos:prefLabel, dct:subject)`
- `tests/e2e/workflow.test.ts > end-to-end: discover → browse → query → create > Step 4: query .meta for concept labels`
