# 0007 — Walking skeleton (M0c): graduation notes, d3 choices, deviations

- **Status:** accepted (M0c landed)
- **Date:** 2026-07-11
- **Scope:** plan milestone M0c — geoms `point`+`line`, identity stat/position,
  linear+band scales, one panel, no canvas/facets/legends/interactivity.

## What was graduated vs rewritten

| Spike module (`spikes/pure/src`)  | Landed as                                           | Changes                                                                                                                                                        |
| --------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale-state.ts` (M0a-2)          | `@ggsvelte/core` `src/scales/state.ts`              | Near-verbatim. Lint-driven mechanical edits only (`codePointAt`, explicit null checks); codec, fingerprint, and training semantics untouched.                  |
| `grouping.ts` (M0a-5)             | `src/grouping.ts`                                   | Adapted to the spec's canonical `ChannelValue` forms: `{ stat }` channels and `null` channels never participate (pre-stat by construction). R fixtures ported. |
| `measure.ts` / `font-metrics.ts`  | `src/layout/measure.ts` / `layout/font-metrics.ts`  | Verbatim. The metrics table is still the macOS-Chromium/Helvetica one from the spike — regeneration in the pinned container is an M1 follow-up (see below).    |
| `ticks.ts` / `layout.ts` (M0a-3)  | `src/layout/ticks.ts` / `layout/layout.ts`          | Verbatim algorithmically; two `if/else` branches restructured to hoist shared trailing code (behavior-identical, sweep still 98.4% converged).                 |
| spike tests (6 suites)            | `packages/core/tests/*` + `tests/fixtures/grouping` | Ported nearly verbatim (paths/imports; `Columns` type rename). All 87 pass.                                                                                    |
| `spikes/browser` registry (M0a-1) | `ggsvelte` `src/lib/registry.svelte.ts`             | Rewritten to the production shape but mechanism-identical: non-reactive Map + monotonic version `$state`, init-time registration, live getter descriptors.     |

Everything else (schema, normalize, validate, builder, portability,
ColumnTable, pipeline, renderers, components) is new M0c code built on the
recorded decisions.

## d3 usage: none (hand-rolled)

The plan allowed d3 micro-modules. The skeleton needs exactly three pieces of
"d3 shaped" functionality, all trivial, so they are hand-rolled and the
packages stay dependency-free apart from `@sinclair/typebox`:

- **Ticks/nice** — the spike already shipped a d3-equivalent 1/2/5 `tickStep`
  - `linearTicks`; `niceLinearDomain` adds the two-round d3-style `nice()`.
- **Linear/band scales** — a normalize-to-[0,1] closure and a first-seen
  index map. d3-scale would be pure overhead here.
- **Line paths** — `pathData()` emits `M/L` commands; `curve: "step"` bends at
  the x midpoint (d3 `curveStep` semantics — chosen over step-before/after so
  the mark stays symmetric). d3-shape becomes worth importing when curves
  beyond linear/step land (basis/natural, M1+); revisit then against the
  bundle-budget allowlist.

## Design decisions made during M0c (not in prior records)

1. **Normalized form has no top-level `aes`.** `normalize()` resolves plot-aes
   inheritance (with null-unset) INTO each layer and drops the plot-level
   mapping. Keeping both would make normalize non-idempotent: a re-run would
   re-inherit channels a layer had explicitly unset with `null`. Equivalence
   tests compare this fully-resolved form.
2. **TypeBox `Static<>` + `Type.Record`/`additionalProperties` collapse to
   `{}`** inside `Type.Module` computed types. The data-container TS types
   (`DataValues`/`DataColumns`/`DataName`) are hand-written aliases layered
   over the module (runtime validation + emitted schema still come from the
   single TypeBox source); a schema-fixture test keeps them honest.
3. **Schema artifact transforms** (per decision 0004): the emitter rewrites
   `$ref: "Name"` → `#/$defs/Name` and `patternProperties: {"^(.*)$": S}` →
   `additionalProperties: S`, strips per-def `$id`s. `schema/v0.json` is
   committed, excluded from oxfmt (generated; emit script owns its bytes),
   and guarded by a staleness test + an ajv-vs-TypeBox verdict-parity test.
   No `$id` URL is claimed yet (hosting is its own work item, per plan).
4. **Axis-title bands are applied AFTER the two-pass layout** (+18px on the
   bottom/left margins). Safe direction: the panel shrinks, measured labels
   still fit; only tick density drifts marginally. Folding titles into the
   layout measurement loop is the clean fix — M1, together with legends.
5. **attw runs `--profile esm-only`**, and the `ggsvelte` package is checked
   by publint only: its d.ts files import `./*.svelte` modules, which no
   node16 resolution mode can resolve — Svelte packages are consumed through
   bundlers via the `svelte` condition. Documented in `scripts/package-lint.ts`.
6. **`bun test` scope is spec+core** (`bun test packages/spec packages/core`);
   the svelte package's tests are vitest-4 browser-mode suites and run in the
   CI component job (and `bun run test:components` locally) — bun's runner
   must not pick them up.
7. **Named lint opt-outs** (`.oxlintrc.json`, never by category): the
   type-aware gate runs `--deny-warnings`, so pedantic warnings are hard
   failures. Disabled by name with in-file rationale:
   `prefer-readonly-parameter-types`, `no-inline-comments`,
   `no-unsafe-type-assertion` (validator/JSON-boundary casts),
   `switch-exhaustiveness-check`, `prefer-math-trunc` (its suggested fix is
   semantically WRONG for uint32 bit math — would break FNV-1a/mulberry32),
   `require-unicode-regexp`, `max-lines`, `max-lines-per-function`; tests
   additionally drop `consistent-function-scoping` and
   `no-unnecessary-type-parameters`.
8. **M0c channel support in the pipeline** is x/y (`{field}` required),
   color (`{field}` discrete, `{value}` literal, `{value, scale: true}`
   through the scale), and `group`. `fill`/`size`/`linewidth`/`alpha`/`label`
   validate in the schema but are inert at render time until their scales
   land (M1); continuous color mappings warn (`color-continuous-unsupported`)
   and are ignored.
9. **Unmapped marks render `currentColor`** (theme-adaptive); data-mapped
   colors are literal palette hexes (`CATEGORICAL_PALETTE_10`, an
   Observable-10-family constant). Grid rides `var(--gg-grid, ...)`.
10. **`sideEffects: false` is accurate, not blanket**: no module-scope
    registration and no CSS emitted from components (registration happens at
    component _instantiation_). If a future entry file gains import-time side
    effects it must be listed explicitly (plan requirement).
11. **`vitest.config.ts` dedupes svelte** (`resolve.dedupe` +
    `optimizeDeps.exclude` for svelte and the testing library): without it,
    vite prebundles one svelte runtime for component imports while the test
    renderer loads the source copy — two runtimes, `effect_orphan` errors.

## Deviations from the letter of the plan/task

- **Advisory `howToOverride` texts reference spec surface that does not exist
  yet** (`scales.x.type` etc. arrive with the M1 scale configs). The texts say
  so explicitly rather than inventing an override that doesn't work.
- **No continuous scale expansion** (ggplot2's 5% `expand`): domains are
  niced only, so extreme data points can sit on the panel edge. M1, with the
  scales work.
- **Temporal fields ride the linear scale over epoch ms** (documented in
  ColumnTable); tick labels for date axes are therefore raw numbers until the
  time scale lands (M1).

## Follow-ups for M1

1. Regenerate `FONT_METRICS` inside the pinned Playwright container against a
   self-hosted font, via an emit script (decision 0003 workflow) instead of
   the spike's copy-paste block.
2. Scale configuration surface (`scales` in the schema) — makes the advisory
   `howToOverride` texts real; continuous color scales; time scale; expansion.
3. Fold axis titles (and legends) into the two-pass layout measurement.
4. Wire `aes` channels beyond x/y/color/group into geometry (size, alpha,
   linewidth as data channels — with the sqrt/linear dimensional split).
5. `ggsvelte-render` CLI bin on the `ggsvelte` package (plan M1) — the pure
   entry is ready for it.
6. SvelteKit-real SSR/hydration round-trip for `<GGPlot>` + SSR scale-state
   adoption (`adoptScaleState` is exported and tested at the core level).
7. Layer-level `data` (schema + pipeline), additive per the union design.
8. `RenderModel.dispose()` + per-stage memoization once update-path budgets
   are measured (benchmarks are in place from this milestone).
9. Bench trend tracking (`github-action-benchmark`) once numbers stabilize;
   the bench-smoke CI job currently proves the suite runs, it does not gate
   on values.
