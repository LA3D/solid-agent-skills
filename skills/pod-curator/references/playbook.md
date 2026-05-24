# pod-curator playbook

Per-finding repair recipes for the substrate curator. Read this before drafting a proposal. The authoritative vocabulary is at `<pod>/ontology/mem` — this file operationalizes it against `pod-audit`'s finding types.

## Staleness taxonomy

The class determines who handles a finding and which way the repair runs. Detection of *dangling* is mechanical (the auditor already did it); everything else needs you to read the surrounding decisions and reason.

| Class (`mem:`) | What it is | Repair direction |
|---|---|---|
| `DanglingReference` | path/IRI no longer resolves (404) | locate current target → realign the pointer |
| `MovedTarget` | referent exists but relocated | find it by content → realign the pointer |
| `SupersededConcept` | a decision retired the named thing (D77→D98) | realign current-state claims; preserve history with a supersession pointer |
| `ScalarDrift` | a count diverged from ground truth | **guard first** (dereference the decision), then realign if truly stale |
| `ProseDrift` | text reads current but narrates an older design | realign prose toward deployed reality |
| `CodeDrift` | code references renamed/removed substrate | repair **code toward the decision** (not prose toward reality) |
| `FalsePositive` | flag resolved as correct against canonical source | withdraw; record the non-repair |

## Mapping pod-audit findings → class + recipe

`pod-audit` findings carry a `constraint` field. Map it, then apply the recipe.

### `resolve:seeAlso` / `resolve:catalog:*` (a pointer 404s)
**Class:** `DanglingReference` (or `MovedTarget` if the target moved rather than vanished).
**Resolve:** GET the parent (storage description / catalog). Find what the pointer *should* name — for a renamed container, the live container set is the `rdfs:seeAlso` list that *does* resolve, cross-checked against the Type Index. For the 2026-05-23 case, `wiki/pages/` + `wiki/sources/` were D98-renamed to `concepts/`.
**Pod-side vs repo-side:** the `.well-known/solid` storage description is assembled from **both** the static `css/config/void-description.json` (NOT PATCHable — repo edit) and the runtime `overlays/wiki-memory/storage-patch.ttl`. A stale `seeAlso` that survives after the overlay is correct almost always lives in the static config. Propose a **repo edit** (name the file + the lines), not an N3 Patch.
**Auto-proposable?** Yes — dangling pointers with an unambiguous live replacement are the safest class.

### `descriptor:untyped` (catalog entry not typed prof:ResourceDescriptor)
**Class:** contract gap (construction, not staleness). The entry works but escapes governance.
**Resolve:** read the descriptor. It already has *some* predicates (e.g. `sh:agentInstruction` + `wiki:selectQuery`). Construct the missing contract predicates: `a prof:ResourceDescriptor`, a `prof:hasRole` from the wikirole scheme (`<pod>/ontology/wikirole`), an `rdfs:label`, a `dct:conformsTo` (the PROF spec), and a `wiki:installedBy` (the overlay that ships it). Compose the label/role from what the descriptor already does.
**Verify the role exists.** `prof:hasRole` must point at a concept that is actually `skos:inScheme <pod>/ontology/wikirole`. GET the scheme and confirm. A reference to a role that isn't defined (e.g. `wikirole:search-affordance` cited by a descriptor but absent from the scheme) is itself a dangling-role finding — propose adding the role concept, don't silently cite a non-existent one.
**Don't force a misfit — see the extension recipe below.** Before reaching for an ill-fitting existing role/subtype (the SPARQL-SELECT contact affordances are *not* `wiki:SearchAffordance` — that subtype is for `?ext=` HTTP dispatch), check whether the right type/role simply doesn't exist yet.
**Pod-side vs repo-side:** these descriptors are served from overlay TTLs (e.g. the addressbook overlay). The proposal is the corrected TTL + a note to fold it back into the overlay so `make reset` reproduces it.

### No existing type or role fits the thing you're repairing
**Class:** conceptual-structure gap (construction). The conceptual structure is *data* and is extensible — but only in a rooted, shaped, routed, documented way (D100, `wiki:ClassExtensionShape`).
**Resolve:** when a finding exposes a genuine gap — a parameterized client-run SPARQL-SELECT affordance has no honest subtype, or a role like `query-affordance` doesn't exist — the correct repair is to **propose a gated extension**, not to jam the resource under the nearest parent. Draft the new class/role per the class-extension contract: `rdfs:subClassOf` an existing rooted class (or `skos:inScheme` for a role concept), with `rdfs:label` + `rdfs:comment`, and route it (Type Index for a class). Land it in `working/curator-proposals/` exactly like any other proposal — `wiki:ClassExtensionShape` validates it (with `inference="none"`) and a higher-trust reviewer approves before it crystallizes. Forcing a misfit pollutes the conceptual graph; a clean gated extension grows it. This is a judgment call worth flagging explicitly for human review.

### `StorageDescriptionShape:agentInstruction` (missing entry-point prose)
**Class:** contract gap (construction).
**Resolve:** compose the entry-point `sh:agentInstruction`. The substrate already has a seed (see the storage-description shape's own `sh:agentInstruction`, and the FOLLOWUPS D104 seed): tell arriving agents to follow `wiki:affordanceCatalog` to enumerate capabilities, `wiki:typeIndex` for routing, `wiki:contextDocument` for prefixes, `wiki:shapeCatalog` for content shapes, `wiki:profileDocument` for the L3 narrative.
**Pod-side vs repo-side:** repo — it belongs in the static StorageDescriber config or the storage-patch overlay so it persists.

### SHACL violation (missing required predicate on a descriptor)
**Class:** `ProseDrift` / contract gap depending on whether the predicate once existed.
**Resolve:** read the `sh:resultMessage` — it names the missing predicate and why. Reconstruct from the descriptor's siblings (other affordances of the same role) and its own prose.

## The proposal — `mem:RealignAction` template

Write one resource per finding (or one per coherent cluster) to `/vault/wiki/working/curator-proposals/<ISO-timestamp>/<slug>.ttl`. Copy the live exemplar shape from `<pod>/wiki/.operations/` (the 2026-05-23 trace). Template:

```turtle
@prefix as:   <https://www.w3.org/ns/activitystreams#> .
@prefix mem:  <https://pod.vardeman.me/vault/ontology/mem#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

<urn:uuid:{generate}>
    a as:Announce, mem:RealignAction, prov:Activity ;
    as:actor <urn:agent:claude-code> ;
    as:target </vault/wiki/working/curator-proposals/> ;
    as:object <{the stale resource — what gets corrected}> ;
    prov:wasAssociatedWith <urn:agent:claude-code> ;
    prov:used <{the authoritative source you resolved against — ground-truth precedence}> ;
    prov:wasDerivedFrom <{the stale prior}> ;
    mem:stalenessClass mem:{DanglingReference|SupersededConcept|...} ;
    mem:rationale "{what you observed, what you resolved against, why this repair. REQUIRED.}" ;
    as:published "{ISO-8601}"^^xsd:dateTime .

# Then the concrete proposed change, so a reviewer can apply it without re-deriving:
#  - Pod-side fix: the N3 Patch (solid:InsertDeletePatch) to run against the target .meta
#  - Repo-side fix: a prose block naming the file + the before/after lines
```

Write it with `solid-pod create <proposal-url> --body <file>`. Do not DELETE or PATCH the affected resource — that is the crystallize step, gated on review.

## Escalation — when NOT to realign

If two equally-authoritative sources genuinely disagree (not "prose lags reality" but a real contradiction the precedence order can't break), do not pick a winner. Emit a `mem:ContradictionDetected` notification over LDN to the Pod owner's inbox and stop. The agent surfaces the conflict; the human resolves it.

## Worked references

- `<pod>/wiki/.operations/` — the 2026-05-23 D77→D98 trace: superseded-concept, dangling-reference, code-drift, and a withdrawn false-positive, all four branches in one session.
- `overlays/wiki-memory/examples/realign-2026-05-23.ttl` (cogitarelink-solid) — the same trace as source TTL.
- The vault method-note *Stale-Memory Discovery and Realignment* — the narrative this playbook operationalizes.
