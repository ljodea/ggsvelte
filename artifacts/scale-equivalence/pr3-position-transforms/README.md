# PR 3 position-transform evidence

Pre-stat scale transforms and positional scale families (`feat/scale-transform-position`).
Implements `artifacts/scale-equivalence/plans/pr3-scale-transform-position-families.md`.

This bundle records the TDD red→green evidence for the PR, plus the final
parity artifacts (canonical spec, semantic stage trace, ggplot2 R output,
ggsvelte output, responsive light/dark screenshots, overlap metrics, browser
verification, performance, dependency-size delta, and explained parity
differences).

## Reproduce

Use native arm64 Bun 1.3.14. Focused test commands:

```sh
BUN=/private/tmp/ggsvelte-bun-1.3.14-arm64/bun-darwin-aarch64/bun
# PATH-resolved scripts (oxlint/oxfmt/tsc/prettier):
export PATH="/private/tmp/ggsvelte-bun-1.3.14-arm64/path-bin:$PATH"

$BUN test packages/spec/tests/position-scale-api.test.ts
$BUN test packages/core/tests/scale-transform.test.ts
$BUN test packages/core/tests/pipeline-scale-stage.test.ts
$BUN test packages/core/tests/pipeline-position-transform.test.ts
$BUN test packages/core/tests/pipeline-position-matrix.test.ts
$BUN test packages/core/tests/position-guide.test.ts
```

Full gates: see `## Required tests and gates` in the plan.

## TDD red→green evidence log

Each entry preserves the exact command and the observed pass/fail summary at
the red (pre-implementation) and green (post-implementation) checkpoints.

<!-- markdownlint-disable MD014 MD040 -->
<!-- EVIDENCE-LOG-START -->

### Slice A — spec foundation (Step 1 red → Impl 1 green)

New tests: `packages/spec/tests/position-scale-api.test.ts`,
`packages/spec/tests/capabilities.test.ts`,
`packages/spec/type-tests/position-scale-parity.ts`.

RED (before implementing schema/normalize/helpers/capabilities):

```
$ bun test packages/spec/tests/position-scale-api.test.ts
SyntaxError: Export named 'scale_x_binned' not found in module '.../scale-helpers.ts'.
 0 pass / 1 fail / 1 error

$ bun run check:type-contracts   # tsc -p packages/spec/type-tests/tsconfig.json
position-scale-parity.ts: 22 errors (TS2305 missing exports, TS2344 false-not-true,
  TS2339 missing transform/oob/naValue, TS2578 unused @ts-expect-error). EXIT 2
```

GREEN (after schema fields + normalize log→linear/log10 + helpers/builder/capabilities +
`bun run schema:emit`):

```
$ bun test packages/spec/tests/position-scale-api.test.ts   → 32 pass / 0 fail
$ bun run check:type-contracts                              → EXIT 0
$ bun test packages/spec                                    → 297 pass / 0 fail / 17 files
$ bun node_modules/.bin/tsc -b packages/spec                → EXIT 0
```

Note: `ScaleExpansion` mult/add tuples are modelled as bounded 2-item arrays
(`minItems/maxItems: 2`) rather than `Type.Tuple`, because TypeBox tuple
`items:[...]` is draft-07 form and ajv 2020-12 (the artifact cross-check in
`tests/artifact.test.ts`) requires `prefixItems`. Runtime validation is identical.

### Slice B–C — transform registry + transformed views (green)

```
$ bun test packages/core/tests/scale-transform.test.ts   → 22 pass / 0 fail
   (registry forward/inverse/valid/monotonicity/immutability +
    TransformedColumnView cache: one kernel run per source key across 100 subsets,
    distinct keys per transform/oob/limits/naValue, censor/squish counts)
$ bun test packages/core/tests/diagnostics.test.ts       → 5 pass (catalog bijection intact)
```

### Slice D–F — pre-stat staging + transformed-space affine trainer (green headline)

New test `packages/core/tests/pipeline-position-transform.test.ts` proves the
acceptance contract end to end:

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts  → 9 pass / 0 fail
```

- `scaleXLog10` reports `type:"linear", transform:"log10"` (no trained `"log"` type);
- the public `domain` stays semantic and positive; decades are evenly spaced in [0,1];
- `normalize(v) == normalizeTransformed(log10(v))` (single forward, no double transform);
- `invert(normalize(v)) == v` (semantic round trip); non-positive `normalize` is NaN;
- a smooth fit and a histogram over log10 x consume transformed x (binwidth/boundary in
  transformed units — boundary 0 = semantic 1, never `log10(0)`);
- `scaleXSqrt` admits semantic zero and spaces perfect squares evenly.

Broad expansion note: non-temporal continuous/binned axes now carry the ggplot2
default 5% multiplicative display expansion; time axes stay flush. This
intentionally moves every non-time continuous baseline (the plan's "broad
non-time baseline movement"); affected in-suite domain goldens are updated to
the expanded values.

### Slice D-F follow-up — geometry double-transform fix (Step 4 red → Impl green)

A gap audit against the plan found that Slices D-F's transformed-space trainer
(`normalize` vs `normalizeTransformed` on `ContinuousScale`) was correct, but
no geometry batch builder had been migrated to call `normalizeTransformed` on
already-transformed frame arrays. Every non-axis-driven geom (points, lines,
bars/histograms, boxplots, errorbars, area/smooth ribbons) was still calling
`.normalize()` on values that `positionColumn`/stat outputs had already run
through `transform.forward` once, so log10/sqrt position scales silently
dropped rows (`log10(log10(1)) = log10(0)`, invalid) and rendered remaining
marks at the wrong (non-uniform) pixel spacing. Annotation intercepts and
band-scale category lookups were unaffected (they correctly read semantic
values through `normalize`).

RED (before fix), added to `packages/core/tests/pipeline-position-transform.test.ts`:

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts
✗ points: no rows dropped, and consecutive decades render at equal pixel gaps
  Expected: 5  Received: 4
✗ lines: path vertices render at the same equal-decade pixel gaps as points
  Expected: 5  Received: 4
 9 pass / 2 fail
```

Live repro before the fix (`scaleXLog10()` over x=[1,10,100,1000,10000]):
x=1 dropped; remaining 4 points at panel-x ≈ 26.4, 66.0, 89.3, 105.7 (gaps
39.7, 23.2, 16.5 px — not log-uniform).

Fix: migrated all frame-array-consuming geometry call sites from
`scale.normalize(transformedValue)` to `scale.normalizeTransformed(transformedValue)`:
`geometry-shared-position.ts` (`positionOf`, used by points/lines/glyphs/segments/smooth),
`geometry-rects-slot.ts` (bar/histogram ymin/ymax and binned xmin/xmax),
`geometry-errorbar-rows.ts`, `geometry-errorbar-width.ts`,
`geometry-paths-closed.ts` (area/density/smooth-ribbon band edges),
`geometry-boxplot-body-layout.ts` (`yPx` over stat_boxplot's transformed-y aggregates),
`geometry-boxplot-outliers.ts`. Left unchanged (correctly semantic):
`geometry-segments-annotation.ts` (xintercept/yintercept are authored source
values), band-scale `.normalize(rawCategory)` call sites, and
`layout-axis-ticks.ts` (semantic tick projection).

GREEN:

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts   → 11 pass / 0 fail
$ bun test packages/core packages/spec                               → 1073 pass / 1 skip / 0 fail
$ bun node_modules/.bin/tsc -b packages/core                         → EXIT 0
$ bun node_modules/.bin/oxlint packages/core/src/pipeline/geometry-*.ts → clean
```

### Shared transformed-origin baseline helper (Step 4 red → Impl green)

`position-bar.ts` (bar/col/area/histogram, via `isBarLike`) and
`frame-stats-density.ts` (density) each independently hardcoded a zero
baseline (`Math.min(0, v)`/`Math.max(0, v)` and a bare `new Float64Array(n)`).
Numerically both already coincided with the plan's transformed-space-origin
rule (forward(0) = 0 for identity/sqrt; log10's special-cased literal
transformed 0), but there was no single helper enforcing/documenting the
invariant, and no `scale-baseline-transformed-origin` advisory.

RED, added to `packages/core/tests/pipeline-position-transform.test.ts`:

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts
✗ emits one deduplicated scale-baseline-transformed-origin advisory per axis
✗ geomDensity under scaleYLog10 renders a finite baseline
 13 pass / 2 fail
```

Fix: added `packages/core/src/pipeline/position-baseline.ts`
(`transformedZeroBaseline(transform)`) as the single source of truth, used by
both `position-bar.ts` and `frame-stats-density.ts`; added the
`scale-baseline-transformed-origin` advisory to `ADVISORY_CATALOG` and emit it
once per axis from `scale-axis-train-continuous-zero.ts` (same function as
`maybeForceZeroForBars`, so it shares that call's per-axis dedup granularity)
whenever `inputs.barMeasure && transform.key === "log10"`.

GREEN:

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts   → 15 pass / 0 fail
$ bun test packages/core packages/spec                               → 1077 pass / 1 skip / 0 fail
$ bun node_modules/.bin/tsc -b packages/core                         → EXIT 0
```

Known follow-up (task 3, transform provenance): density's `yNumeric` (count/
density/scaled/ndensity) is not yet forwarded through the y-axis transform
before this baseline is applied — the semantic-measure forward-once step
lands with the provenance slice.

### Transform provenance — semantic-measure forward-once (Step 4 red → Impl green)

Gap: stat-invented mapped measures (`count`, bin `count`/`density`/`ncount`/
`ndensity`, density's `density`/`count`/`scaled`/`ndensity`) were never
forwarded through the configured axis transform — only the STAT INPUTS
(smooth/bin/density x, summary/boxplot y) were transformed via
`positionColumn`, per Slices D-F. A `scaleYLog10()` on a count/density-driven
geom silently misread the raw measure as if it were already scale-space,
producing wildly wrong trained domains (verified empirically: a bar chart
with counts 10/100 under `scaleYLog10()` trained a semantic domain of
`~1e105`; a histogram count axis produced `~1e42`).

RED, new `packages/core/tests/pipeline-position-transform-provenance.test.ts`:

```
$ bun test packages/core/tests/pipeline-position-transform-provenance.test.ts
✗ count-stat bar chart: domain 1.0000000000000002e+105 (expected < 1000)
✗ count-stat stack gap ratio: 0.0999... (expected ~1, equal-decade log spacing)
✗ histogram count axis: domain 1e+42 (expected < 1000)
✗ density y measure: domain[0] not distinguishable from the un-forwarded case
 2 pass / 4 fail
```

(Two guard tests — smooth fit y, boxplot aggregates — passed immediately:
these outputs are correctly `scale-space`, computed FROM already-transformed
inputs via `positionColumn`, and must never be forwarded again; they anchor
the transform² regression.)

Fix: added `packages/core/src/pipeline/stat-measure-transform.ts`
(`forwardMeasureOnce(column, transform)`, elementwise `forward` + `valid`
censor-to-NaN, no-op when no transform configured) — the single call this
codebase makes for the `semantic-measure` provenance role, as opposed to
`positionColumn`'s already-transformed `scale-space`/`source-applied` reads.
Wired into `frame-stats-count.ts` (`count`), `frame-stats-bin-frame.ts`
(count/density/ncount/ndensity), `frame-stats-density.ts`
(density/count/scaled/ndensity). Re-verified discriminating power by
temporarily short-circuiting `forwardMeasureOnce` to a no-op: all 4 fixed
tests correctly went red again (including the two density/bin-density tests,
which needed care to avoid the zero-baseline-dominates-the-domain confound —
see in-file comments on using the bottom rect edge, not the top, when values
sit below the semantic-1 log10 baseline).

GREEN:

```
$ bun test packages/core/tests/pipeline-position-transform-provenance.test.ts   → 7 pass / 0 fail
$ bun test packages/core packages/spec                                          → 1084 pass / 1 skip / 0 fail
$ bun node_modules/.bin/tsc -b packages/core                                    → EXIT 0
```

Known follow-up (deferred, not blocking): the plan's Step 0 also calls for a
formal machine-readable provenance INVENTORY test enumerating every stat
output's declared role (source-applied/scale-space/semantic-measure) and a
pipeline-stage golden that fails on reordering/double-transformation. This
slice fixes and regression-tests the actual behavior (the correctness bug);
the standalone inventory/golden scaffolding is unbuilt.

### Lint generalization — `log-nonpositive-data` → `transform-domain-data` (Step 1 red → green)

Gap: the plan retires the late-log codes and generalizes spec lint's
`log-nonpositive-data` advisory to a transform-aware `transform-domain-data`
advisory "covering canonical log10 and sqrt forms, update `LINT_CATALOG`,
tests, docs, and search projections, and preserve authored `type: "log"`
detection before normalization." `packages/spec/src/lint.ts` was untouched by
the prior work: it still keyed only on `config.type === "log"` (missing
canonical `transform: "log10"` and `transform: "sqrt"`), carried the retired
`log-nonpositive-data` code, and its header comment still cited the retired
`log-nonpositive` / `log-domain-not-positive` codes.

RED, added to `packages/spec/tests/lint.test.ts` (renamed describe +
source-scan bijection guard):

```
$ bun test packages/spec/tests/lint.test.ts
✗ transform-domain-data > fires on authored type:log (pre-normalization)
✗ transform-domain-data > fires on canonical transform:log10
✗ transform-domain-data > fires on transform:sqrt (mixed neg/non-neg)
✗ LINT_CATALOG coverage > source-scan: bijective (retired code still present)
 19 pass / 4 fail
```

Fix (`packages/spec/src/lint.ts`):

- catalog entry `log-nonpositive-data` → `transform-domain-data` (summary +
  rationale generalized to log10 `<= 0` and sqrt `< 0`);
- new pure `transformDomainOf(config)` resolving the effective forward domain
  from the spec _before_ normalization: authored `type:"log"` → log10,
  canonical `transform:"log10"` → log10, `transform:"sqrt"` → sqrt (`>= 0`);
- advisory fires only on MIXED data (some in-domain, some out) — all-invalid
  stays the pipeline's error/warning; one advisory per axis;
- header division-of-labor comment updated to cite `scale-transform-domain`.

Also regenerated docs projections that embed `LINT_CATALOG`:
`apps/docs/src/lib/generated/routes.ts`, `search-index.ts`.

GREEN:

```
$ bun test packages/spec/tests/lint.test.ts            → 23 pass / 0 fail
$ bun test scripts/gen-llms.test.ts                    → 25 pass / 0 fail
$ bun node_modules/.bin/tsc -b packages/spec            → EXIT 0
$ bun node_modules/.bin/oxlint packages/spec/src/lint.ts → clean
$ bun scripts/gen-docs-routes.ts && bun scripts/gen-docs-search.ts → wrote (no stale code)
```

Preserved deliberately: `docs/decisions/0012-m3-notes.md` still names the
retired `log-nonpositive-data` code — it is a historical M3 decision record
describing the state at that time, not a live catalog projection.

### Structural scale-config preflight (Step 1 red → green)

Gap (gap-audit 1.4/1.5): the spec API suite deliberately defers structural
transform conflicts to the core pipeline (`position-scale-api.test.ts:8-10`),
but no core preflight existed. A conflicting `{ type: "log", transform: "sqrt"
|"identity" }` (which `normalize()` leaves uncanonicalized on purpose) flowed
straight into `resolveColumnTransform` (`position-program.ts:117` reads
`config.transform` regardless of `type`), silently producing an incoherent
scale instead of the plan's `scale-type-transform-conflict` error. `zero:true`

- log10 (`scale-zero-invalid-for-transform`) was likewise never rejected.

RED, new `packages/core/tests/pipeline-scale-preflight.test.ts`:

```
$ bun test packages/core/tests/pipeline-scale-preflight.test.ts
✗ scale-type-transform-conflict > type:log+sqrt at /scales/x/transform
✗ scale-type-transform-conflict > type:log+identity
✗ scale-type-transform-conflict > time+non-identity transform
✗ scale-type-transform-conflict > throws even when data is empty
✗ scale-zero-invalid-for-transform > zero:true under log10
 3 pass / 5 fail
```

Fix: `packages/core/src/pipeline/scale-config-preflight.ts`
(`assertScaleConfiguration`), wired into `prepare-panels.ts` right after
`assertTemporalConfiguration` (runs before data execution, incl. empty data).
Cataloged both codes in `PIPELINE_ERROR_CATALOG` (`diagnostics.ts`). Errors are
thrown as rich `PipelineError` (severity/path/problem/cause/fixes/docs).

GREEN:

```
$ bun test packages/core/tests/pipeline-scale-preflight.test.ts   → 8 pass / 0 fail
$ bun test packages/core/tests/diagnostics.test.ts                → 5 pass (bijection intact)
$ bun node_modules/.bin/tsc -b packages/core                      → EXIT 0
```

### Rich `RenderModel.scaleDiagnostics` for transform/OOB events (Step 5 red → green)

Gap (gap-audit 1.6): `scale-transform-domain` / `scale-oob-censored` /
`scale-oob-squished` were emitted only into the lean `{ code, message }`
warning channel (`prepare-panels-frames.ts:42-58`); the plan requires them
materialized through the rich `scaleDiagnostics` path (problem/cause/fixes/docs

- bounded evidence), like `guidePlanDiagnostics()`.

RED, new `packages/core/tests/pipeline-scale-diagnostics.test.ts` (log10 over
x=[1,10,-5,100], one domain drop):

```
$ bun test packages/core/tests/pipeline-scale-diagnostics.test.ts
  ✓ still emits the lean warning
  ✗ also materializes a rich ScaleDiagnostic with problem/cause/fixes/docs
  ✗ carries bounded evidence (failedCount + sampled failing values)
  ✗ deduplicated per axis/field (one rich entry)
 1 pass / 3 fail
```

Fix: `emitTransformDomainWarnings` now pushes a rich `ScaleDiagnostic`
alongside each lean warning, with `evidence.failedCount` and (for
transform-domain) up to 5 sampled failing semantic values via
`sampleFailingSemantic`. Threaded through `buildPanelFrames`'s
`scaleDiagnostics` return (`[...temporal.diagnostics, ...transformDiagnostics]`),
which `assembleRenderModel` already merges into `RenderModel.scaleDiagnostics`.

GREEN:

```
$ bun test packages/core/tests/pipeline-scale-diagnostics.test.ts   → 4 pass / 0 fail
$ bun test packages/core packages/spec                              → 1107 pass / 1 skip / 0 fail
$ bun node_modules/.bin/tsc -b packages/core                        → EXIT 0
$ bun node_modules/.bin/oxlint packages/core/src/pipeline/prepare-panels-frames.ts → clean
```

A machine-readable `gap-audit.md` mapping every normative plan promise to
implemented/tested/status now lives beside this file.

### `scale-break-outside-domain` — surface dropped continuous breaks (Step 5 red → green)

Gap (gap-audit 1.8): `layout.ts:235` already filters explicit continuous
breaks to those inside `[min,max]` (the expanded display domain — ggplot2 keeps
breaks in the expansion band, so this filter is correct), but the drop was
silent; the cataloged `scale-break-outside-domain` code was never emitted.

RED, new `packages/core/tests/pipeline-scale-breaks.test.ts`:

```
$ bun test packages/core/tests/pipeline-scale-breaks.test.ts
✗ warns when an explicit break (1000) falls outside the ~[1,9] domain
 1 pass / 1 fail
```

Fix: after training, `trainContinuousAxis` (`scale-axis-train-continuous.ts`)
counts explicit `config.breaks` outside the trained `scale.domain` and pushes a
`scale-break-outside-domain` warning naming the omitted values — the same
criterion the layout tick filter uses, so warning and rendered ticks agree.
Cataloged in `PIPELINE_WARNING_CATALOG`.

GREEN:

```
$ bun test packages/core/tests/pipeline-scale-breaks.test.ts   → 2 pass / 0 fail
$ bun test packages/core/tests/diagnostics.test.ts             → 5 pass (bijection intact)
$ bun test packages/core packages/spec                         → 1109 pass / 1 skip / 0 fail
$ bun node_modules/.bin/tsc -b packages/core                   → EXIT 0
```

Follow-up (P2): materialize this warning on the rich `scaleDiagnostics` channel
too (the training pass does not yet receive the `scaleDiagnostics` array; the
temporal analog rides `guidePlan.degraded`).

### Step 0 stage + provenance guards (`pipeline-scale-stage.test.ts`)

Gap (gap-audit 2.1/2.2/2.3): the plan's Step 0 requires three machine-readable
guards that were missing (only a behavioral transform² check existed). Added
`packages/core/tests/pipeline-scale-stage.test.ts` (19 assertions):

- `POSITION_READ_INVENTORY` — enumerates every continuous-position geometry
  read and the space it must project; asserts the transformed-geometry files
  (`geometry-shared-position`, `-rects-slot`, `-errorbar-*`, `-paths-closed`,
  `-boxplot-*`) call `normalizeTransformed`, and the semantic annotation file
  (`geometry-segments-annotation`) never does. A revert to bare `.normalize()`
  on a transformed frame array (the `log10(log10(v))` double-transform bug from
  the Slice D-F follow-up) fails this inventory.
- `PROVENANCE_INVENTORY` — assigns every stat output a role and asserts the
  `semantic-measure` producers (count, bin count/density/ncount/ndensity,
  density density/count/scaled/ndensity) call `forwardMeasureOnce` exactly once
  while the `scale-space` producers (smooth/summary/boxplot) never do; forbids
  `source === "stat"` as a transform-decision key in the transform modules.
- Stage-order behavioral golden — a log10 point pipeline proving affine
  training in transformed space (decades evenly spaced), a semantic single-
  forward domain (`normalize(v) == normalizeTransformed(log10(v))`), and a
  semantic round-trip invert.

GREEN:

```
$ bun test packages/core/tests/pipeline-scale-stage.test.ts   → 19 pass / 0 fail
$ bun node_modules/.bin/oxlint packages/core/tests/pipeline-scale-stage.test.ts → clean
$ bun test packages/core packages/spec                        → 1128 pass / 1 skip / 0 fail
```

Verified out-of-band (no code change needed): every claimed scale helper
(camelCase + snake_case) is re-exported at the `@ggsvelte/svelte` package root
(`packages/svelte/src/lib/index.ts`); `@ggsvelte/core` intentionally does not
re-export them ("where applicable" in the plan). gap-audit 4.2.

---

### Session 4 (2026-07-21) — binned integer bin-id + P2 tail

**Binned family 3.1–3.6 (P1/P2).** Replaced the snap-to-center-as-key design
with a separate stable integer bin-id vector, and integrated stat-over-binned:

- `binned-scale.ts`: new `assignBinId` (−1 sentinel, right-closed inclusive
  lowest), `binIdColumn`, `minBinWidth`; `assignBinCenter` reimplemented on top
  of `assignBinId`.
- `LayerFrame.xBinId`/`yBinId` (`Int32Array | null`) added to
  `types-layer-frame.ts` + `emptyFrameExtras` (every constructor safe by
  default); `frame-identity.ts` fills them alongside the snapped centers.
- `frame-stats-count.ts`: binned count aggregates by bin id, then restores
  transformed centers (`xNumeric`) and semantic inverse-center values
  (`xValues` → tooltips/candidates); `xBinId` retained.
- `position-bar.ts` `barSlotKeys`: stack/fill/dodge group by the integer id,
  not the rendered float center.
- `position-jitter.ts`: binned axes default jitter amount to
  `0.4·minBinWidth` (transformed), fixing single-bin collapse; never ids.
- 3.5: `MAX_BINNED_BREAKS` moved to `@ggsvelte/spec` (`schema.ts`), re-exported
  by core; TypeBox `breaks maxItems = MAX_BINNED_BREAKS + 1`; `schema/v0.json`
  regenerated (`bun run schema:emit`).

RED (each discriminating, confirmed failing before the fix):

```
$ bun test packages/core/tests/pipeline-position-binned-ids.test.ts
  → SyntaxError: Export named 'binIdColumn' not found  (pre-impl)
  → later: jitter spread over a single 100-wide bin = 0 (id/collapsed resolution)  → FAIL
$ bun test packages/core/tests/pipeline-position-binned.test.ts
  → 66 breaks now rejected by TypeBox (SpecValidationError) not runtime  → drove dual-ownership test
```

GREEN:

```
$ bun test packages/core/tests/pipeline-position-binned-ids.test.ts   → 12 pass / 0 fail
$ bun test packages/core/tests/pipeline-position-binned.test.ts       → 6 pass / 0 fail
```

**P2 tail.** 1.7 + 1.8-rich: `assemble-render-model-scale-training-diagnostics.ts`
synthesizes rich `scaleDiagnostics` for `scale-baseline-transformed-origin`
(advisory) and `scale-break-outside-domain` (warning, with `evidence.values`/
`failedCount`) from the already-deduped lean channels — no invasive threading of
a collector through the training pass. 1.9: `layout-axis-formatters.ts` emits
`unused-scale-option` when `minorBreaks` loses to `dateMinorBreaks`. 4.2-identity:
`packages/svelte/tests/scale-helper-root-parity.ssr.test.ts` asserts
`svelte[name] === spec[name]` binding identity.

GREEN:

```
$ bun test packages/core/tests/pipeline-scale-training-diagnostics.test.ts → 3 pass / 0 fail
$ bun test packages/core/tests/pipeline-temporal.test.ts                   → 49 pass / 0 fail
$ vitest run --config vitest.ssr.config.ts (svelte)                        → 58 pass / 0 fail
$ bun test packages/core packages/spec                                     → 1146 pass / 1 skip / 0 fail
$ tsc -b packages/spec packages/core                                       → clean
$ tsc -p packages/spec/type-tests/tsconfig.json                            → clean
$ oxlint (all touched files)                                               → 0 errors
$ oxfmt --check (all touched files)                                        → clean
```

### Session 5 (2026-07-21) — release artifacts and candidate semantic boundary

Documentation/release work completed locally without an external model call:

- ADR 0015, task-first scales guide, 0.4→0.5 migration guide, two verbatim
  Svelte migration fixtures, package/root READMEs, synchronized skill text,
  and a three-package minor changeset with `Migration:` marker;
- deterministic eval 49 (log10 × smooth/bin/density), including a MockResponder
  branch whose 1/1 dry run exits zero;
- seven measured PR 3 benchmark workloads, all under their native-Bun budgets;
- packed-consumer log10/binned helper compile and render coverage;
- canonical spec, semantic stage trace, ggplot2 4.0.3 reference output and PNG,
  ggsvelte SVG, dependency delta, parity notes, six responsive light/dark
  captures, overlap metrics, zoom evidence, and browser verification.

Focused green evidence:

```
$ bun test scripts/migration-fixtures.test.ts scripts/gen-llms.test.ts \
    scripts/gen-docs-routes.test.ts scripts/gen-docs-search.test.ts
  → 35 pass / 0 fail
$ bun test tests/evals/harness.test.ts
  → 17 pass / 0 fail
$ bun tests/evals/run.ts --dry-run --cases 49-pre-stat-log-statistics
  → PASS, structural=1, valid=true, render=true
$ cd benchmarks && bun run bench-json.ts
  → 31 workloads measured; all seven PR 3 workloads under budget
```

Browser QA then found a real boundary bug: an inspected synthesized smooth
candidate exposed transformed x `4.928` instead of semantic source x `84734`.
The root cause was `resolveCandidateLogicalValues()` falling back directly to
`frame.xNumeric`/`frame.yNumeric`, which are scale-space for stat outputs. A red
regression reproduced first candidate `(0,0)` instead of semantic `(1,1)`.
The resolver now inverse-projects configured transforms exactly once.

```
$ bun test packages/core/tests/pipeline-position-transform.test.ts
  RED: 15 pass / 1 fail (Received xValue 0; expected 1)
  GREEN: 16 pass / 0 fail
$ bun /tmp/repro-candidate.ts
  before: 0 0 5 null
  after:  0 1 5 null
```

Fresh Chromium QA reported no console errors, complete tick titles, zero label
overlap at 320/640/1200, semantic inspection x=84734, semantic precise zoom
ticks 1k/2k/5k/10k with nine surviving points, and reset restoration to 24.

<!-- EVIDENCE-LOG-END -->
<!-- markdownlint-enable MD014 MD040 -->

## Results

See `browser-verification.json`, `overlap-metrics.json`, `performance.json`,
`semantic-stage-trace.json`, `ggplot2-reference.json`, and
`parity-differences.md`. Source-first visual baselines remain intentionally
absent from this feature branch.
