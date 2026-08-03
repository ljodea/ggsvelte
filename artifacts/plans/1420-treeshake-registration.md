# Plan: #1420 — break side-effect registration so GGPlot apps tree-shake unused geoms/stats

> Reviewed by grok-4.5 (user asked for grok3; unavailable in this CLI — only grok-4.5).
> Verdict: SHIP-WITH-CHANGES. All [BLOCKER]/[SHOULD-FIX] findings folded in below.

## Problem

`@ggsvelte/core`'s full barrel registers every stat frame builder and geom batch at
module scope and installs Temporal. Three leak sites:

1. `packages/core/src/index.ts:17-20` — module-scope register-all + install-temporal imports.
2. `packages/core/src/pipeline.ts:61-65` — same three side-effect imports.
3. `packages/core/src/install-temporal.ts:47` — module-scope `installTemporal()`.

`@ggsvelte/svelte` runtime imports `runPipeline` from `@ggsvelte/core` → every GGPlot
app bundles ALL stats + geoms. ggsvelte-full = 335.6 KB gzip (svelteplot 108.7,
chartjs 72.7). Precedent: `@ggsvelte/core/render` lean entry +
`benchmarks/competitive/lean-polyfill-graph.test.ts` attribution test.

## Design (three explicit registration tiers)

1. `registerAll()` — from `@ggsvelte/core` (re-exported from `@ggsvelte/svelte`):
   all stat frames + geom batches + `installTemporal()`. One-call opt-in preserving
   today's full-grammar DX (migration path for spec-driven/headless apps).
2. `registerBasic()` — thin public wrapper over `registerBasicGeomBatches()` + the
   basic stat frames registration (currently private module-scope in
   `frame-stats-register-basic.ts`). GGPlot gets this transitively via `/render`.
3. Per-family `register<Family>()` functions, each in its own module importing ONLY
   that family's builders (importing from a shared register-all module defeats
   tree-shaking). Generated `<GeomX>` shells call theirs in `<script module>`.

**GGPlot defaults:** basic geoms/stats (identity charts work out of the box) +
Temporal installed (date-axis behavior preserved; grok R2 — keep for this issue,
follow-up candidate: lazy install on first temporal scale).

**Keyed by default stat, not geom name (grok finding 6):** aliases normalize away
(GeomHistogram→geom bar + **stat bin**; GeomFreqpoly→line + **bin**;
GeomDensity→geom density [basic] + **stat density**). Shell registration covers the
geom batch AND its default stat frame; basic-tier pieces are skipped.
bin/density stay specialty (not added to basic) — components register them.

## Confirmed test seams

- **Seam A (core public API):** `registerAll`/`registerBasic`/per-family
  `register<Family>` exported from `@ggsvelte/core`; idempotent; calling them makes
  the pipeline render the corresponding chart.
- **Seam B (fresh-process negative/positive):** Node smoke script: fresh import of
  `@ggsvelte/core` → smooth spec throws "not registered" error (message now mentions
  `registerAll()`); after `registerAll()` → renders. Necessary because bunfig.toml
  preload registers everything in-process (grok finding 5).
- **Seam C (svelte component self-registration):** browser test in its OWN file
  importing only `<GGPlot>` + `<GeomSmooth>` (vitest browser keeps per-file
  isolate) asserts smooth path marks render with NO `registerAll` anywhere in the
  file. Must stay isolated from the global test registration (grok finding 5).
- **Seam D (bundle attribution, issue acceptance):** new test beside
  `lean-polyfill-graph.test.ts` Vite-building a fixture `<GGPlot>` + point/line app
  (svelte plugin) asserting the module graph excludes geometry-smooth /
  frame-stats-smooth / frame-stats-density-2d / frame-stats-sf / frame-stats-contour
  / geometry-violin / geometry-hex / geometry-boxplot + rawBytes ceiling. Written
  FIRST (red) — doubles as the before-measurement.

## Implementation slices (TDD)

**Slice 0 — Seam D red + baseline.** Fixture `benchmarks/competitive/fixtures/`
GGPlot scatter app + attribution test; record baseline size in PR body.

**Slice 1 — core explicit registration (Seams A+B).**

- Remove module-scope `registerAllStatFrames();`/`registerAllGeomBatches();` calls
  at the bottom of the two register-all modules; export the functions.
- Make basic stats registration an exported function (mirror
  `registerBasicGeomBatches`) instead of private module-scope; keep
  `render-entry.ts` calling both basics at module scope (its side-effect contract
  stays; `/render` keeps "identity charts just work").
- `index.ts`: drop the 3 module-scope imports; re-export `runPipeline` etc. from
  `./pipeline/run-pipeline.js` + `./pipeline/public-api.js` (NOT `./pipeline.js` —
  grok finding 1); export `registerAll()` + `registerBasic()` + per-family fns.
- `pipeline.ts`: strip side-effect imports entirely (grok R1 — no permanent
  tests-only full barrel; it re-breaks tree-shaking on accidental import). Becomes a
  pure re-export barrel. bun test preload already registers all for unit tests.
- `install-temporal.ts`: keep module-scope `installTemporal()` ONLY for the
  temporal-entry graph — restructure: `temporal-entry.ts` keeps
  `import "./install-temporal.js"` side effect. Cleanest: install-temporal.ts keeps
  exporting `installTemporal`; move the module-scope call into temporal-entry.ts.
- `packages/core/package.json` sideEffects: remove `./dist/index.js` + register-all
  modules; keep render-entry, temporal-entry, install-temporal (still has
  module-scope call for temporal-entry graph — decide: if the call moves to
  temporal-entry, drop install-temporal from the list too), register-basic modules.
- Error copy: `geometry-dispatch.ts:27` + `frame-stats.ts:33` → mention
  `registerAll()` / per-family register fns (grok finding 12).
- CLI: `runCLI` (`packages/core/src/cli.ts`) calls `registerAll()` at entry (grok
  finding 4 — CLI must keep full grammar).
- Consumers: `apps/docs/.../static-svg.ts` + any headless `renderToSVGString` users
  of specialty geoms add `registerAll()`; audit examples/ (mostly component-driven →
  fine after Slice 3); packages/skill docs updated.

**Slice 2 — per-family register modules (Seam A).**

- Audit `geometry-register-basic.ts` + `frame-stats-register-basic.ts` coverage;
  build the 49-geom mapping table in the generator manifest keyed by (geom batch,
  default stat) → basic | family module.
- New `pipeline/register-<family>.ts` modules (smooth, boxplot, violin, hex,
  contour, density_2d, qq, qq_line, quantile, dotplot, errorbar, range
  (crossbar/linerange/pointrange), abline, curve, rug, function, sf, bin, density,
  ydensity, bindot, connect, ecdf, ellipse, function, manual, sum, summary,
  summary_bin, unique, align, spoke — final list from the audit).
- register-all modules become compositions over per-family modules (single source).
- New public exports get `@lifecycle experimental` tags; run gen-lifecycle.

**Slice 3 — svelte (Seam C).**

- `runtime/runtime.svelte.ts`: `runPipeline`/`planStrata` from
  `@ggsvelte/core/render`; `installTemporal()` (from `@ggsvelte/core/temporal`)
  called at module scope.
- `src/lib/index.ts`: re-export `registerAll`; switch runPipeline/planStrata/
  renderToSVGString re-exports to `/render` equivalents (verify surface parity).
- Generator + manifest: specialty shells gain `<script module>` calling their
  family register fn (imported from `@ggsvelte/core`); basic shells unchanged.
  Regenerate; `bun run geom:children:gen --check` green.
- Test infra: `tests/helpers/model.ts` + `ggplot-ssr-endpoint.ts` call
  `registerAll()` at module scope (spec-driven suites); audit other spec-driven
  specialty test files and add explicit `registerAll()` imports where needed.
  Seam C file imports NOTHING that registers all.
- Seam C browser test (GeomSmooth renders without registerAll).

**Slice 4 — bench + docs.**

- ggsvelte-full entries call `registerAll()` (stay the max-grammar ceiling row —
  do NOT claim the issue's win on that row; grok finding 7).
- Add `ggsvelte-ggplot` row to the competitive bench (svelte plugin; scatter
  fixture from Slice 0) so bundles.json records the real GGPlot number.
- Re-run `bun run measure:bundles`; record before/after in PR body + bundles.json.
- Migration note: CHANGELOG + docs migration home; honest size notes (Temporal
  ~36 KB gzip stays in GGPlot bundles; always-on align/map/positions residual —
  grok findings 2+10; TypeBox validate path is why ggsvelte-full stays big).
- knip.jsonc: new register exports — check unused-exports noise; CONTEXT.md /
  support-matrix if they describe "import core = full grammar".

## Review decisions locked

- R1: strip pipeline.ts side effects; CLI calls registerAll(). ✔ grok
- R2: Temporal stays on GGPlot this issue; follow-up = lazy install. ✔ grok
- R3: `<script module>` registration. ✔ grok (idempotent, SSR/HMR safe)
- R4: rollup keeps unannotated calls in used modules; Seam D proves it. ✔
- R5: `stat` override to a specialty stat needs explicit register — documented
  limitation, error message guides. ✔
- R6: cover thin register modules via Seams A/B/C; don't lower thresholds. ✔

## Acceptance

- [ ] Seam D attribution test green (GGPlot + point/line excludes
      smooth/density/sf/contour/violin/hex/boxplot modules).
- [ ] Full suites green: core bun tests, svelte browser + SSR vitest, CLI tests.
- [ ] Migration note in CHANGELOG/docs; error copy updated.
- [ ] Bench re-run; ggsvelte-ggplot number recorded (target band ~150–200 KB gzip;
      if above, Temporal-lazy is the documented follow-up).
