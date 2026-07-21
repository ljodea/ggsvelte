# PR 3 gap audit — plan promise → implemented / tested / status

Machine-readable checklist mapping each normative promise of
`artifacts/scale-equivalence/plans/pr3-scale-transform-position-families.md`
to the actual uncommitted code. Severity: P0 (correctness/data), P1 (contract),
P2 (required guard/test), P3 (docs/evidence). `status` reflects state AFTER the
in-flight fixes recorded in `README.md`.

Legend: DONE = implemented+tested this session; OK = already correct pre-session;
GAP = missing; PARTIAL = present but incomplete; DEFERRED = belongs to
docs/evidence or a later reviewed API, recorded not weakened.

## (1) Preflight + cataloged diagnostic ownership + rich scaleDiagnostics + lint

| id   | promise                                                                                                                                                                                                             | severity | impl                                                                                                                                                                                                               | test                                                                                                                                                        | status                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Generalize spec lint `log-nonpositive-data` → `transform-domain-data` (log10+sqrt), preserve authored `type:log` pre-normalize; update LINT_CATALOG, tests, docs, search projections                                | P1       | `packages/spec/src/lint.ts` `transformDomainOf` + catalog                                                                                                                                                          | `packages/spec/tests/lint.test.ts` (renamed describe + source-scan bijection)                                                                               | DONE                                                                                                                                                                                        |
| 1.2  | Update stale division-of-labor comment in `lint.ts` (retire `log-nonpositive`/`log-domain-not-positive` mentions)                                                                                                   | P1       | header comment updated to cite `scale-transform-domain`                                                                                                                                                            | source-scan guard asserts codes absent                                                                                                                      | DONE                                                                                                                                                                                        |
| 1.3  | Retire late-log codes `log-domain-not-positive`/`log-nonpositive` from core src+catalog+tests                                                                                                                       | P1       | already absent from core `diagnostics.ts` + emit sites                                                                                                                                                             | `packages/core/tests/diagnostics.test.ts` bijection                                                                                                         | OK (comment lingers `pipeline-m1.test.ts:399`, `docs/decisions/0012-m3-notes.md` — historical, preserved)                                                                                   |
| 1.4  | `scale-type-transform-conflict` fails pipeline preflight before data at `/scales/<axis>/transform` (type:log+identity/sqrt; time+non-identity)                                                                      | P1       | `packages/core/src/pipeline/scale-config-preflight.ts` `assertScaleConfiguration`, wired in `prepare-panels.ts`                                                                                                    | `packages/core/tests/pipeline-scale-preflight.test.ts`                                                                                                      | DONE                                                                                                                                                                                        |
| 1.5  | `scale-zero-invalid-for-transform` pre-execution error for explicit `zero:true`+log10                                                                                                                               | P1       | `scale-config-preflight.ts` (`!transform.valid(0)`)                                                                                                                                                                | `pipeline-scale-preflight.test.ts`                                                                                                                          | DONE                                                                                                                                                                                        |
| 1.6  | Data-dependent scale warnings (`scale-transform-domain`, `scale-oob-censored`, `scale-oob-squished`) also materialized through rich `RenderModel.scaleDiagnostics` with problem/cause/fixes/docs + bounded evidence | P1       | `prepare-panels-frames.ts` `emitTransformDomainWarnings` pushes both channels; threaded into `scaleDiagnostics` return                                                                                             | `packages/core/tests/pipeline-scale-diagnostics.test.ts`                                                                                                    | DONE                                                                                                                                                                                        |
| 1.7  | `scale-baseline-transformed-origin` per-axis advisory routed through rich channel too                                                                                                                               | P2       | lean advisory from `scale-axis-train-continuous-zero.ts:44`; rich entry synthesized from the deduped lean channel in `assemble-render-model-scale-training-diagnostics.ts` (wired into `assemble-render-model.ts`) | `pipeline-scale-training-diagnostics.test.ts` (rich problem/cause/fixes/docs, once, `/scales/y`)                                                            | DONE                                                                                                                                                                                        |
| 1.8  | `scale-break-outside-domain` warning: explicit breaks filtered + surfaced, matching `temporal-break-outside-domain` ownership                                                                                       | P1       | lean warning in `scale-axis-train-continuous.ts`; rich entry (with `evidence.values`/`failedCount`) synthesized in `assemble-render-model-scale-training-diagnostics.ts`                                           | `pipeline-scale-breaks.test.ts` (lean) + `pipeline-scale-training-diagnostics.test.ts` (rich)                                                               | DONE (lean + rich)                                                                                                                                                                          |
| 1.9  | `unused-scale-option` owns generic `minorBreaks` losing to `dateMinorBreaks`                                                                                                                                        | P2       | emit added in `layout-axis-formatters.ts` (mirrors breaks/dateBreaks + labels/dateLabels precedence)                                                                                                               | `pipeline-temporal.test.ts` (both set → "dateMinorBreaks takes precedence")                                                                                 | DONE                                                                                                                                                                                        |
| 1.10 | `invalid-scale-expansion` / `invalid-scale-na-value` / `invalid-scale-minor-breaks`                                                                                                                                 | P2       | malformed shapes rejected by TypeBox schema                                                                                                                                                                        | `position-scale-api.test.ts:79-102` (`accepts(...) === false` for negative/overlong/unknown-key expand, non-numeric naValue, empty/non-numeric minorBreaks) | RESOLVED — see note A: the plan assigns malformed shapes to TypeBox/spec validation (DONE+tested); no semantic contradiction survives TypeBox to justify a separate emittable pipeline code |
| 1.11 | Core source↔catalog scanner stays bijective; spec lint gains source-scan coverage test                                                                                                                              | P2       | core bijection intact; spec source-scan added                                                                                                                                                                      | `diagnostics.test.ts`, `lint.test.ts`                                                                                                                       | DONE                                                                                                                                                                                        |

Note A (RESOLVED): TypeBox/runtime schema enforces the _shape_ of
`expand`/`naValue`/`minorBreaks` and every malformed case is already rejected —
`position-scale-api.test.ts:79-102` asserts `accepts(...) === false` for
`expand.mult: -1`, `expand.add: [-1,0]`, overlong `mult: [1,2,3]`, unknown key
`{ bogus: 1 }`, `mult: "x"`, non-numeric/boolean `naValue`, and empty/`["a"]`
`minorBreaks`. The plan's diagnostic-ownership paragraph explicitly assigns
"malformed shapes and unsupported enum values" to TypeBox/spec validation — so
this contract is met. No semantic contradiction was found that passes TypeBox
yet is still invalid, so there is nothing for a dedicated emittable
`invalid-scale-*` pipeline code to catch; adding one would be a dead catalog
entry (breaks the bijection "no dead entries" guard in `diagnostics.test.ts`).
Not a gap.

## (2) Stage / provenance inventory + golden guards (plan Step 0)

| id  | promise                                                                                                                                                               | severity | status                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Machine-readable inventory enumerating every positional read with axis-program/space declaration; fails while any caller lacks it                                     | P2       | DONE — `POSITION_READ_INVENTORY` in `packages/core/tests/pipeline-scale-stage.test.ts` maps each continuous-geometry read to transformed/semantic space and asserts `normalizeTransformed` presence (catches a revert-to-`.normalize()` double-transform) |
| 2.2 | Provenance inventory assigning every stat output role (source-applied/scale-space/semantic-measure); forbids `MappedField.source` as transform key                    | P2       | DONE — `PROVENANCE_INVENTORY` asserts semantic-measure producers call `forwardMeasureOnce` exactly once and scale-space producers never do; `source === "stat"` forbidden as a transform-decision key in the transform modules                            |
| 2.3 | Pipeline-stage golden (`parse→transform/OOB→stat→position→affine train→guide→coord→render`) failing on reorder/double-transform; named `pipeline-scale-stage.test.ts` | P2       | DONE — behavioral stage-order block (affine-in-transformed-space, semantic single-forward domain, round-trip invert) in the same file, alongside the two inventories                                                                                      |

## (3) Binned family correctness (plan "Binned position family")

| id  | promise                                                                                                              | severity | status                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Pre-stat transform + automatic nice boundaries in transformed space, inverse-projected for semantic labels           | P1       | DONE — `binned-scale.ts` picks transformed boundaries; log10 binned axis ticks read as semantic decades, not transformed 1/2/3 (`pipeline-position-binned-ids.test.ts` "binned guides are SEMANTIC")                                                                                                     |
| 3.2 | Stable integer bin ids; retained internal bin-key vector separate from rendered x/y for stack/fill/dodge grouping    | P1       | DONE — `assignBinId`/`binIdColumn` produce a separate `Int32Array` bin-id vector; `LayerFrame.xBinId`/`yBinId` retained; `barSlotKeys` groups by the integer id, not the rendered float center (`position-bar.ts`)                                                                                       |
| 3.3 | Stats requiring discrete positions (count/bar) consume bin ids; jitter uses transformed bin width, never integer ids | P1       | DONE — `frame-stats-count.ts` aggregates by bin id then restores transformed centers + semantic inverse; jitter defaults to `0.4·minBinWidth` (transformed), never the id/collapsed resolution (`position-jitter.ts`); continuous stats (smooth/density/…) still read transformed SOURCE values (tested) |
| 3.4 | Right-closed inclusive-lowest bins                                                                                   | P2       | OK+TESTED (`pipeline-position-binned.test.ts`, `pipeline-position-binned-ids.test.ts` bin-id assignment)                                                                                                                                                                                                 |
| 3.5 | `MAX_BINNED_BREAKS=64` exported, shared by TypeBox + runtime + `binned-scale-break-limit`                            | P2       | DONE — constant now lives in `@ggsvelte/spec` (schema.ts), re-exported by core; TypeBox `breaks` `maxItems: MAX_BINNED_BREAKS + 1` (65 boundaries → 64 bins); runtime + error keep the same constant; schema/v0.json regenerated                                                                         |
| 3.6 | No bin integer leaks to public model/tooltip/zoom; GuidePlan semantic                                                | P1       | DONE — count candidates expose semantic inverse-center x; identity marks keep raw source tooltip x; public domain + axis ticks are semantic; guarded by `pipeline-position-binned-ids.test.ts`                                                                                                           |

Note B (RESOLVED): the earlier snap-to-center-as-key divergence is replaced by a
separate stable integer bin-id vector (`xBinId`/`yBinId`); continuous readers use
the transformed center, discrete consumers (count, stack/fill/dodge) key off the
id, and jitter uses the transformed bin width. The binned × count × stack × facet
matrix is covered in `pipeline-position-binned-ids.test.ts`.

## (4) API / capability / export cross-validation

| id  | promise                                                                            | severity | status                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Capability ledger validates helper identity, normalization, docs, and agent text   | P2       | DONE — `packages/spec/tests/capabilities.test.ts` and `scripts/gen-llms.test.ts`                                                                                                             |
| 4.2 | Cross-validation covers package roots where applicable                             | P2       | DONE — `packages/svelte/tests/scale-helper-root-parity.ssr.test.ts` asserts Svelte/spec binding identity for every helper and alias; core intentionally does not re-export authoring helpers |
| 4.3 | Interaction consumers use linear/time family plus transform; stale log is rejected | P1       | DONE — tested across `bounds-editor`, `precise-bounds`, `consumption`, and `controller`                                                                                                      |

## Documentation and evidence (P3)

DONE:

- ADR 0015 records semantic/transformed/pixel spaces, binned two-phase behavior,
  decision 0013's explicit pre-1.0 correctness exception, and no dual staging.
- `/guide/scales-guides` and `/guide/upgrading#0-4-to-0-5` document helpers,
  aliases, OOB, expansion, transformed units, zoom, and family-plus-transform
  migration. Before/after Svelte fixtures pass the verbatim migration guard.
- `.changeset/brave-position-transforms.md` covers spec/core/Svelte and carries
  the required `Migration:` marker.
- Deterministic eval 49 combines log10 smooth, bin, and density and passes 1/1.
- Seven native-Bun benchmark workloads cover 100k transforms/stats/facets and
  max-bound binned assignment; all PR 3 budgets pass. Packed consumer coverage
  compiles/renders log10 and binned package-root helpers.
- Canonical spec, stage trace, ggplot2 4.0.3 R/JSON/PNG reference, ggsvelte SVG,
  dependency delta, parity notes, overlap metrics, six responsive theme
  screenshots, zoom screenshot, and browser verification are checked in under
  `artifacts/scale-equivalence/pr3-position-transforms/`.
- Package READMEs, capability ledger, both synchronized agent-skill copies,
  manifest, docs routes/search/seeds, schema, and lifecycle projections are
  updated.

## Session progress summary

Closed in prior sessions: 1.1, 1.2, 1.4, 1.5, 1.6, 1.8 (lean), 1.11, 2.1, 2.2,
2.3; 4.2 exports verified present.

Closed THIS session (2026-07-21, red→green, evidence in README):

- **Binned 3.1–3.6 (P1/P2)** — separate stable integer bin-id vector
  (`assignBinId`/`binIdColumn`/`minBinWidth` in `binned-scale.ts`; `LayerFrame`
  `xBinId`/`yBinId`); identity marks snap to transformed centers keeping source
  tooltip x; count aggregates by bin id then restores transformed centers +
  semantic inverse; stack/fill/dodge group by id (`barSlotKeys`); jitter uses
  transformed bin width; continuous stats read transformed source values;
  semantic inverse guides; no id leak. 3.5: `MAX_BINNED_BREAKS` moved to
  `@ggsvelte/spec`, TypeBox `breaks maxItems = MAX_BINNED_BREAKS + 1`, schema
  artifact regenerated. Tests: `pipeline-position-binned-ids.test.ts` (12) +
  updated `pipeline-position-binned.test.ts`.
- **P2 tail** — 1.7 + 1.8-rich (rich `scaleDiagnostics` for baseline
  transformed-origin + break-outside-domain, synthesized from the deduped lean
  channels in `assemble-render-model-scale-training-diagnostics.ts`;
  `pipeline-scale-training-diagnostics.test.ts`); 1.9 (`unused-scale-option`
  for `minorBreaks` vs `dateMinorBreaks` emitted + tested); 4.2-identity
  (`svelte[name] === spec[name]` binding parity in
  `packages/svelte/tests/scale-helper-root-parity.ssr.test.ts`).

Gates this session: core+spec 1146 pass / 1 skip / 0 fail; tsc -b + spec
type-contracts clean; svelte SSR 58 pass; oxlint 0 errors + oxfmt clean on all
touched files. Note-A remains RESOLVED (malformed expand/naValue/minorBreaks are
TypeBox-rejected + tested).

A final browser pass exposed one additional candidate-boundary bug: synthesized
smooth candidates returned transformed x (`4.928`) instead of semantic source x
(`84734`). Root cause was the candidate resolver falling back directly to
scale-space frame numerics. It now inverse-projects configured x/y transforms
exactly once; the focused regression and browser reproduction pass.

Remaining: final repository gates, commit, push, and PR creation. No open
correctness, contract, documentation, or evidence gap is known.
