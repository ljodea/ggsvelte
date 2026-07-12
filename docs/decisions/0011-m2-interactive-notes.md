# 0011 — M2 facets, coord flip, canvas strata, interaction depth

- **Status:** accepted (completes milestone M2 together with decision 0010's
  statistical half)
- **Date:** 2026-07-11
- **Scope:** plan milestone M2's facets/interaction half — `facet`
  (wrap + grid, fixed/free scales), `coord: { type: "flip" }`, per-layer
  `render` backends + canvas strata (graduating spike 0006), the unified
  hit index, hover/tooltip, brush + brush-to-zoom, run-id/resize/dispose
  follow-through, the a11y pass, examples/VR growth, and benchmarks.

## Surface added (all additive; schema regenerated)

- **Spec:** `facet: { wrap? | rows?/cols?, ncol?, scales? }` (FieldRef
  channels; wrap XOR grid — `facet-form-*` error codes), `coord:
{ type: "cartesian" | "flip" }`, per-layer `render: "svg" | "canvas" |
"auto"`, plot-level `a11y: "auto" | "force-svg"`. Defaults canonicalize
  AWAY in `normalize()` (cartesian / auto are the absent forms).
- **Builder:** `.facet()`, `.coord("flip")` / `.coordFlip()`, `.a11y()`,
  `render` in every geom-sugar option bag.
- **Core:** `Scene.panels[]` (per-panel origin/size/strip/axes/grid),
  `panelIndex` on every batch, `RenderModel.layerBackends/layerFields/
row()/dispose()`, `TrainedScales.panels`, `planStrata()` (pure),
  `ContinuousScale.invert()`, `batchMarkCount()`, `CANVAS_AUTO_THRESHOLD`.
- **`@ggsvelte/core/dom` (real now):** canvas batch renderers
  (`drawBatch`/`drawStratum`, `sizeCanvasForDpr`, `drawClippedToPanel`,
  `cssColorResolver`) and the unified hit index (`buildHitIndex`,
  `StaticQuadtree`).
- **Svelte:** `<GGPlot facet coord a11y tooltip onhover brush onbrush zoom
onzoom width="container">`, component export `resetScales()`, `<Tooltip>`
  (snippet-based content), `render` on every `<GeomX>` child.

## Facets (partition BEFORE stats/positions — plan round-2 consensus)

- Partition happens right after data binding: each panel gets a
  `ColumnTable.subset()` whose field TYPES are inherited from the parent
  (a panel's all-null slice must scale like its siblings). Stats, stacks,
  and dodges run per panel — R-fixture-proven (below). `rowIndex` remaps
  panel-local rows back to SOURCE rows, so hit-testing/tooltips are
  facet-transparent.
- **The one cross-panel stat coupling is deliberate:** bin-stat BREAK GRIDS
  are shared across panels when x is fixed (`statBin` gained a `range`
  override) and per-panel under `free_x` — both bit-exact against ggplot2
  (fixtures 02/03).
- Scales: fixed = union-trained (one scale); free positional domains train
  per panel with the TYPE decided once from the union evidence; discrete
  color/fill assignment is ALWAYS global — one legend, same value = same
  color in every panel (tested).
- Layout: outer chrome (axis-title bands + legend column) first, then
  per-panel margins measured over every panel's domains (elementwise max
  keeps the grid regular), then a second `layoutPass` at the true panel
  size re-derives ticks — the facet mirror of decision 0003's two-pass
  rule. Fixed scales draw edge axes only (left column + bottom-most panel
  per column — wrap's last row may be partial); free dimensions draw
  per-panel axes. Strip band 18px, panel spacing 8px (`STRIP_BAND`/
  `PANEL_SPACING`; layout-internal constants, not yet spec-themable —
  follow-up 4).
- Panel order: values sort ascending (numeric for quantitative/temporal
  fields, lexicographic otherwise), null last as its own "(null)" panel
  (ggplot2's NA panel). Wrap default `ncol = ceil(sqrt(n))`.
- **Deviations from ggplot2 (documented, deliberate):** grid panels get ONE
  combined top strip ("row / col") instead of ggplot2's top+right edge
  strips (follow-up 3); discrete domains stay first-seen (decision 0005
  lineage) while ggplot2 sorts factor levels — parity tests match BY LABEL.

## coord flip (the single orientation mechanism)

One transform, no second orientation code path: geometry is computed
against the unflipped frame with swapped extents, then every vertex maps
`(x, y) -> (W - y, H - x)` (`flipBatchInPlace`; rects swap width/height).
That single mechanism flips bars, stacks, dodges, boxplots, rules,
ribbons — anything the six batch kinds can express — and puts the first
band at the BOTTOM, matching ggplot2. Axes/grid/titles follow because the
layout runs on "display-side" scales (bottom shows the y channel under
flip); zero-forcing stays on the y CHANNEL (the measure), so horizontal
bars still anchor at 0. Hit-testing needs no special casing (it reads
final geometry). R fixture 04 pins the axis contract (discrete scale on
y bottom-to-top, count range on x) and the unchanged layer_data.

## R fixtures (packages/core/tests/fixtures/facets, ggplot2 4.0.3 / R 4.6.1)

| Case               | Assertion                                                                                                                     | Tolerance              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 01 wrap-count      | per-panel counts through the FULL pipeline (rect geometry inverted through the shared count scale), matched by (PANEL, label) | exact (integers)       |
| 02 wrap-bin fixed  | shared break grid: per-panel xmin/xmax/count vs layer_data                                                                    | 1e-9 (exact algorithm) |
| 03 wrap-bin free_x | per-panel break grids                                                                                                         | 1e-9                   |
| 04 coord-flip bar  | flipped axis contract (labels bottom-to-top, count axis on x) + horizontal bar geometry recovering ggplot2 counts             | exact / placement      |

Note: ggplot2 emits zero-count rows for categories absent from a panel;
ggsvelte's count stat emits only present categories (the zero bars draw
nothing) — the parity test accounts for it.

## Canvas strata (spike 0006 graduated verbatim)

- `render: "auto"` resolves to canvas above 2000 marks per layer
  (`RunOptions.canvasThreshold`; advisory `canvas-auto` names the count,
  the threshold, AND the a11y/copy-SVG tradeoff). Explicit hints win
  silently; `a11y: "force-svg"` beats everything. `renderToSVGString`
  ignores backends entirely (always all-SVG, the export path).
- `planStrata()` groups CONTIGUOUS same-backend batches (glyph batches are
  pinned to SVG — text is never canvas). The pipeline emits batches
  LAYER-major across panels precisely so facet panels never fragment
  strata; svg/canvas/svg hints produce exactly three mark strata.
- `<GGPlot>` builds the sandwich only when a canvas stratum exists
  (all-SVG plots keep the single `<svg class="gg-plot">` DOM — M1
  compatible): chrome-bottom SVG (paper/grid/axes/strips) → mark strata in
  order (one `<canvas>` per canvas stratum + its a11y block; SVG mark
  strata are `aria-hidden` presentation slices) → chrome-top SVG
  (titles/legends/caption) → interaction overlay → capture layer LAST.
  No z-index anywhere; every stratum `pointer-events: none`
  (component-asserted, per spike).
- DPR recipe and save/beginPath/rect/clip/restore panel clipping are the
  spike's, unchanged. Canvas colors resolve through `cssColorResolver`
  (reads `--gg-*`/currentColor off the live DOM at draw time; a
  MutationObserver on `<html data-theme>` triggers redraw so theme flips
  restyle canvas like CSS restyles SVG).
- `data-gg-ready` now ALSO waits for every canvas stratum's first paint
  (paint notifications are `untrack`ed — a tracked read of paint state
  inside the attachment is an effect loop, found the hard way).
- **Panel clipping (0008/0010 follow-up) landed for SVG too:** both
  renderers clip marks to panel rects (`<clipPath>` per panel — always,
  single-panel included; adapter ids are `$props.id()`-namespaced,
  renderToSVGString ids stay deterministic by design).

## Hit index + hover/tooltip

- Plot-pixel space, built once per committed scene from layout output,
  never DOM geometry; the capture layer converts client coords and asks it
  — stratum-independent by construction (component-tested with canvas
  points under an SVG line).
- Points: **hand-rolled static quadtree** (documented in quadtree.ts: the
  hit index needs build-once + radius/rect queries only; d3-quadtree's
  incremental machinery is dead weight and zero-runtime-deps is a project
  constraint). Bucket 16, max depth 12, brute-force-cross-checked.
- Rects: exact containment (no slop — bars abut). Segments/stroked paths:
  point-to-segment distance ≤ linewidth/2 + tolerance. Filled paths:
  even-odd point-in-polygon, row = nearest vertex. Glyphs: not hit targets
  in M2 (documented). **Default tolerance 3px** (documented rationale in
  hit-index.ts).
- Hover/tooltip/highlight are pure overlays — component test asserts the
  model identity and onrender count are UNCHANGED during hover. Default
  tooltip content = the hit layer's `layerFields` (field-mapped channels)
  resolved through `RenderModel.row()`; custom content is a snippet.

## Brush + brush-to-zoom

- Transient brush rect on the overlay; on release the hit index's
  `queryRect` yields unique source rows → `onbrush({ x0..y1, rows, hits })`
  (sub-4px drags emit `null`). Selections exclude synthesized rows.
- Zoom = an intentional respec: the brushed rect inverts through
  `ContinuousScale.invert()` (reverse- and log-aware) into explicit
  `scales.{x,y}.domain` + `nice: false`; `prevScales` flow through the
  commit path so **color assignments never shift** (component-asserted:
  zoom a colored scatter, every fill byte-identical). Double-click resets;
  `resetScales()` (component export) additionally clears grow-mode scale
  state. Limitations (documented): band axes don't zoom; faceted plots
  don't zoom (single panel only) — M3 candidates.

## Run ids, resize, memory

- `width: "container"`: ResizeObserver on the plot root, rAF-debounced;
  the run-id gate already guarantees only the newest result commits
  (resize-storm component test drives four widths back-to-back).
- `RenderModel.dispose()` (0008 follow-up): releases geometry/panels/
  legends and inerts `row()`. `<GGPlot>` disposes the previous model in
  the commit-path `$effect` cleanup (runs after the DOM has moved to the
  new model) and the last model on unmount — component-asserted.

## A11y pass (honest accounting)

- SVG plots: `role="img"` + deterministic aria-label + `<title>` (M1),
  now plus **keyboard-focusable point marks** when a tooltip is enabled:
  tabindex 0, `role="img"`, per-mark aria-label from mapped fields, focus
  shows the tooltip. Cap: 100 marks per batch (Batch.svelte constant) —
  beyond it marks are not individually focusable.
- Canvas strata: sr-only `role="img"` description block (spike recipe:
  clip-path hidden, NEVER display:none) + a focusable "Show data table"
  toggle revealing a real `<table>` of the stratum's rows (capped at 100
  with a "first N of M" note).
- Honest limitations (also stated in the `canvas-auto` advisory and the
  schema description): canvas marks expose NO per-mark a11y and don't
  survive copy-SVG/print — `a11y: "force-svg"` is the escape hatch; text
  glyphs aren't hit/focus targets; SVG mark strata in sandwich mode are
  intentionally `aria-hidden` (the chrome-bottom SVG carries the img role,
  once).

## Examples + VR proof

Six new examples (27 total): `facet/wrap` (fixed, shared break grid),
`facet/wrap-free-y`, `bar/horizontal` (THE flip case), `point/canvas-scatter`
(10k seeded points → canvas stratum), `interaction/tooltip`,
`interaction/brush-zoom`. Interaction examples render static under `?vr`
(interactions are component-tested, never screenshotted). Manifest
regenerated. **Two-run VR determinism proven locally: 54 shots (27 × 2
themes) at `maxDiffPixels: 0`, retries 0 — canvas raster included.**
`tests/visual/__screenshots__/` stays empty (container baselines await the
first CI bootstrap, decision 0009).

## Benchmarks (Apple Silicon dev machine; plan workloads)

| Workload                                                                | Result   |
| ----------------------------------------------------------------------- | -------- |
| faceted bars 50 panels — runPipeline                                    | ~12.5 ms |
| faceted bars 50 panels — renderToSVGString                              | ~13.4 ms |
| canvas 100k scatter COLD (pipeline + plan + draw + hit index; stub ctx) | ~83 ms   |
| canvas 100k scatter REDRAW (drawStratum only; stub ctx)                 | ~0.57 ms |
| hit index build, 100k points                                            | ~20 ms   |
| context: runPipeline 100k points                                        | ~57 ms   |
| context: renderToSVGString 100k points                                  | ~85 ms   |

The canvas numbers are JS COMMAND cost against a stub 2d context (bun has
no raster; documented in the bench file) — real paint cost is browser-side
and exercised by the readback component test. The redraw-vs-SVG-string gap
(0.57 ms vs 85 ms at 100k) is the hybrid-rendering story the plan's
budgets anticipate; formal budget gating remains M3.

## Test/gate summary

- Unit: 402 bun tests (was 361): +5 R-parity (facets/flip), +24 facet/flip/
  backend/dispose, +12 hit-index/quadtree/strata (+ snapshot growth).
- Component: 27 vitest browser tests (was 15): facet DOM, flip, canvas
  readback + sandwich order + inertness, a11y block/table/force-svg,
  hover-across-strata, keyboard-focus tooltip, brush selection, zoom color
  stability + reset, container resize, disposal.
- All gates green: check / build / lint / type-aware / svelte-check (pkg +
  docs) / knip / fmt / publint + attw / actionlint / zizmor / manifest /
  schema staleness / pre-commit BOTH stages / bench-smoke / VR (local
  two-run proof).

## Follow-ups (M3 candidates)

1. Facet strip theming + edge strips for the grid form (top cols / right
   rows like ggplot2); facet spacing/strip metrics through the spec theme.
2. Brush-to-zoom on faceted plots and band axes (category-subset domains).
3. `{ stat }` channels beyond y (0010 follow-up 4) and errorbar dodge
   (0010 follow-up 2) still open.
4. Canvas raster benchmarks in a real browser (bench page), and the
   canvas threshold (2000) re-tuned from that data (plan M4).
5. VR container baselines still await the first CI bootstrap (0009).
6. Tooltip positioning across page-scrolled/transformed ancestors uses
   getBoundingClientRect on the capture layer — audit under CSS zoom.
7. Roving tabindex for large SVG batches (current: hard 100-mark cap).
