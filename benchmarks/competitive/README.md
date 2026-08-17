# Competitive browser + bundle bench

Measures ggsvelte against **general** charting libraries, not only Svelte peers.

External references that shaped the matrix:

- [leeoniya/uPlot](https://github.com/leeoniya/uPlot) — multi-series time-line cold paint, size, interaction
- [Lightning-Chart/javascript-charts-performance-comparison](https://github.com/Lightning-Chart/javascript-charts-performance-comparison) — multi-geom (line/scatter/area/step/spline) × load / stream / capacity

## Why this exists

The first competitive harness measured **one** colored scatter (SVG) at 1k/10k against D3 (+ SveltePlot/LayerCake for **bundle only**). That is enough to over-fit optimisations to a single geom and miss where specialists win (multi-series lines on canvas, streaming, capacity).

This suite expands:

| Axis    | Coverage                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geoms   | scatter, multi-series line, multi-series area, stacked bars                                                                                                         |
| Sizes   | 1k → 10k default; full matrix adds 100k scatter, uPlot-scale 3×55.5k line, 10×10k line                                                                              |
| Libs    | ggsvelte SVG, ggsvelte canvas, D3, **uPlot**, **Chart.js**, **ECharts**, **TanStack Charts (React)**, plus SveltePlot/LayerCake/Unovis/**TanStack Charts (Svelte)** |
| Metrics | gzip bundle per lib×scenario; browser cold mount + full remount (median)                                                                                            |

Internal mitata workloads in `benchmarks/` remain the self-regression gate. This package is the **external** comparison.

## Commands

```sh
# Install monorepo deps from repo root first: bun install

bun run measure:bundles    # Vite minify + gzip -9
bun run measure:browser    # Playwright Chromium, default case matrix
bun run measure:ssr        # server-side SVG render throughput (no browser)
bun run measure            # bundles + browser

COMPETITIVE_FULL=1 bun run measure:browser   # includes 100k / uPlot-scale cells
COMPETITIVE_FULL=1 bun run measure:bundles
bun test                   # catalog integrity
```

Results: `results/bundles.json`, `results/browser.json`.

## Docs homepage charts

The docs homepage and repo README chart cells under claim discipline in
`scripts/gen-benchmark-charts.ts` (refuses to emit a chart when ggsvelte SVG
no longer beats LayerCake SVG, SveltePlot, Unovis, TanStack Charts Svelte,
and ECharts). Six-bar tabs use the default `measure:browser` matrix; the
published ECharts bar is the full-chart canvas generalist against ggsvelte
SVG (not the marks-only ggsvelte canvas harness). The Line 100k tab
uses both form factors (ggsvelte SVG + canvas, LayerCake SVG + canvas,
Unovis, TanStack Svelte) from `measure-100k-peers.ts`. Scatter 100k stays in
that harness but is not a homepage tab. SveltePlot is still measured there,
but the Line 100k chart omits it — its mount time stretches the axis so the
other bars collapse. After
re-measuring, regenerate from the
repo root:

```sh
bun run measure:browser                     # default matrix → results/browser.json
bun run measure:browser:100k-peers          # 100k form-factor → results/browser-100k-peers.json
# from repo root:
bun scripts/gen-benchmark-charts.ts         # rewrites apps/docs/static/benchmarks/*.svg
bun scripts/gen-benchmark-charts.ts --check # docs CI freshness gate
```

## Fairness notes (read before optimising)

1. **Apples and oranges by design.** uPlot is a lean canvas time-series painter with almost no grammar. ggsvelte runs a ggplot-like pipeline (scales, stats hooks, guides, candidates). Beating uPlot on raw line paint is a long game; the matrix shows the gap honestly.
2. **ggsvelte-canvas harness draws mark strata only** (no axis/legend SVG chrome). That isolates mark cost; production `GGPlot` still composites SVG chrome.
3. **ggsvelte-svg** is `renderToSVGString` innerHTML — full chart including axes. The adapter uses direct `SpecInput` objects rather than fluent builder sugar so bundle cells measure the renderer graph, not an optional authoring API; output-equivalence tests lock the same normalized chart.
4. **`replace` is a full remount**, not in-place `setData`. The browser harness therefore **does not re-sample** replace (it mirrors mount stats) until a real in-place update metric lands (LightningChart's streaming score).
5. **`area-multiseries` is overlaid (identity), not stacked.** ggsvelte `geomArea` defaults to `stack`; adapters pass `position: "identity"` so ggsvelte matches D3/Chart.js/ECharts/uPlot overlays. `bars-stacked` remains the stack fairness cell.
6. **No interaction (mousemove) or max-capacity sweep yet.** uPlot's table and LC's capacity/stream metrics are the next expansion targets.
7. **Svelte peers** (SveltePlot, LayerCake, Unovis, TanStack Charts Svelte) mount real component fixtures in Playwright for browser + bundle; SSR is measured separately. TanStack Charts React is a generalist cell (same `defineChart` grammar, `@tanstack/charts/react` host), not a Svelte-peer gate.
8. Compare **within one machine and one run**. Absolute ms are host-sensitive (same as internal budgets).
9. **Paint-inclusive timing** waits two animation frames after mount, so small cases sit near a ~1–2 frame floor. Use denser cases (`line-3x10k`, `scatter-color-10k`, full matrix) to rank libraries.
10. **SSR throughput (`measure:ssr`) is reported, not cherry-picked.** Each lib renders data -> SVG string with no browser: ggsvelte via `renderToSVGString`, peers via Svelte 5 `render()` of the same fixture components (LayerCake with its documented `ssr` prop). Honest findings: **LayerCake out-renders ggsvelte at 1k** (plain string concat beats the full grammar pipeline at small N — the cell is kept, not hidden); **SveltePlot and Unovis server-render empty shells** (marks live in client-side `$effect` / `onMount`), recorded as `ssrCapable: false` — never a 0 bar. Any _other_ lib regressing to an empty shell fails the run loudly (`minMarks`).
11. **uPlot scatter** sorts x ascending before paint (uPlot requires monotonic `data[0]`); that sort is inside the timed path for this adapter.

## Scenario catalog

See `scenarios.ts` (`CASES`, `LIBS`). Stable case ids (e.g. `line-3x55k`, `scatter-color-10k`) are the keys in results JSON.

Default browser cells include at least:

- `scatter-color` @ 1k, 10k
- `line-multiseries` @ 3×1k, 3×10k
- `area-multiseries` @ 3×1k
- `bars-stacked` @ 50×4

## Adding a lib or scenario

1. Add data shape / case to `scenarios.ts`.
2. Implement `adapters/<lib>.ts` mount.
3. Wire `fixtures/main.ts` switch.
4. Add `entries/<lib>__<scenario>.ts` for bundle graph.
5. Extend `scenarios.test.ts` so the catalog cannot collapse back to scatter-only.
