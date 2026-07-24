# @ggsvelte/core

## 0.10.1

### Patch Changes

- 2b31212: <!-- markdownlint-disable MD041 -->

  fix: band x-label ladder prefers wrap / −45° over −90°+truncate (#634)

  Auto categorical labels now (1) try balanced ≤2-line wraps when greedy
  needs more lines, (2) check wrap collisions on top-aligned line planes
  matching the renderer, and (3) pick −45° vs −90° from parallel-baseline
  text clearance instead of AABB-vs-column false positives.

  Migration: none — auto layout quality only; author guide pins unchanged

- 4a31bf1: <!-- markdownlint-disable MD041 -->

  fix: wrap-then−45° hybrid band labels when plain wrap fails (#637)

  Auto categorical labels that cannot wrap now balance multi-word text onto
  ≤2 shorter lines and rotate at −45° before full-string −45°/−90° + truncate.
  Svelte and SVG renderers draw multi-line end-anchored rotated ticks.

  Migration: none — auto layout quality only; author guide pins unchanged
  - @ggsvelte/spec@0.10.1

## 0.10.0

### Minor Changes

- 69415d9: <!-- markdownlint-disable MD041 -->

  feat: portable within-mark gradients and bounded glow (#591)

  Add a closed JSON-serializable paint vocabulary on compatible geom params
  (`fillPaint`, `strokePaint`, `glow`) with deterministic linear/radial gradients,
  ordered hex color stops, required solid fallbacks, and bounded glow radii.

  Migration: none — additive

### Patch Changes

- 5d04e1f: <!-- markdownlint-disable MD041 -->

  fix: remaining multi-table edges after per-layer DataRef

  Binned axes and fixed histogram bin ranges read each layer filtered table;
  transform diagnostics count filtered (not unfiltered) rows; scale validation
  keeps per-layer field evidence; boxplot outlier lineage is not double-remapped
  under facets; Svelte identity epochs fingerprint geom-child data props.

  Migration: none — corrects multi-table behavior under per-layer data

- 7e3b717: <!-- markdownlint-disable MD041 -->

  Add a model-owned semantic viewport for panel lookup, pixel/domain inversion,
  domain projection, categorical identity resolution, and interval candidate
  queries. Route Svelte interval selection, precise bounds, inspection panel
  lookup, and brush zoom through that shared coordinate boundary.

- af2efc2: <!-- markdownlint-disable MD041 -->

  fix: cap and clip rotated left/right facet strip labels to panel height

  Long side-strip labels no longer paint into neighboring multi-row panels.
  Labels truncate with ellipsis to the panel-height advance budget; SVG/Svelte
  strip chrome clips to the strip band as defense in depth. Strip band width
  is remeasured against that vertical budget.

- 38683bc: <!-- markdownlint-disable MD041 -->

  fix: ribbon temporal preflight, band measure drop, outline focus mute

  - Preflight xmin/xmax only for rect/ribbon (not unused point mappings)
  - Drop ribbon rows when measure projection is non-finite (band measure axes)
  - Mirror fill focus masks onto presentation-only ribbon outline batches

- 59232e8: <!-- markdownlint-disable MD041 -->

  fix: segment endpoint grouping, binned extent, auto-hit, validation

  - Exclude xend/yend from default discrete grouping
  - Gate binned-axis endpoint fields to segment layers only
  - Preserve geometry-based auto hit mode for geom segment
  - Reject non-field segment endpoint mappings at validate time

- 92e7049: <!-- markdownlint-disable MD041 -->

  fix: multi-table DataRef post-merge edges from #603

  - Seed named table cache from plot-level named data
  - Deduplicate plot+layer named refs in validation maxRows
  - Snapshot data on builder .layer()
  - Unify binned style binExtent across layers
  - Gate legend rowFilters to layers that map the scale field
  - Skip globalSourceRows retention on annotation frames

- Updated dependencies [69415d9]
- Updated dependencies [5d04e1f]
- Updated dependencies [127e3fc]
- Updated dependencies [59232e8]
- Updated dependencies [92e7049]
- Updated dependencies [ae74d06]
  - @ggsvelte/spec@0.10.0

## 0.9.0

### Minor Changes

- e45a6a5: # Facet value order, labels, and strip position

  Extend facet field configuration with JSON-serializable options for closed panel order, display labels, and strip placement (issue #590).

  - `facet.wrap|rows|cols.levels` — closed explicit panel order (empty panels for missing levels; unknown data values diagnosed and excluded)
  - `facet.wrap|rows|cols.labels` — display-label map (identity keys stay semantic)
  - `facet.strip.position` — `top` (default) | `bottom` | `left` | `right`; left/right bands are measured and reserved in layout
  - `facet.strip.show` — set `false` to hide strip chrome when labels are authored elsewhere

  Migration: none — additive

  Defaults preserve ascending sort and top strips.

- 463adcf: # Fixed-aspect coordinates

  Add strict `coordFixed`/`coord_fixed`/`coordEqual` authoring and fit exact physical data-unit ratios inside responsive chart chrome. Fixed-scale facets keep equal panels, free positional facets fail early, theme-owned letterbox gutters render consistently across Core and Svelte, and constrained layouts preserve ratio with an explicit degraded diagnostic.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-8-to-0-9>

  Replace outer-wrapper CSS aspect-ratio workarounds with `coord={coordFixed()}`. Fixed coordinates now reject free positional facet scales; use fixed facets or remove the fixed coordinate.

- 6179954: <!-- markdownlint-disable MD041 -->

  feat: add geom segment for finite two-endpoint lines (x,y → xend,yend)

  Migration: none — additive

- f8723b4: <!-- markdownlint-disable MD041 -->

  feat: optional per-layer `data` (DataRef) with multi-table pipeline support

  Migration: none — additive

  Layers may supply their own `{values}` / `{columns}` / `{name}` data; when
  omitted they inherit plot-level data. Shared scales train over the union of
  layer tables, facets replicate annotation layers that omit facet fields, and
  `model.row()` resolves global multi-table source ids. Builder and declaration
  geom sugar accept layer `data` as well.

### Patch Changes

- 29f05e4: <!-- markdownlint-disable MD041 -->

  fix(core): union facet panel keys across complete per-layer DataRef sources

  When several layer-local tables each carry the facet fields but different
  levels, facet layout no longer stops at the first complete table. Panel keys
  are the union of every complete source so later layers cannot introduce
  orphaned levels.

  Migration: none — corrects multi-table facet layout under per-layer data

- Updated dependencies [e45a6a5]
- Updated dependencies [463adcf]
- Updated dependencies [6179954]
- Updated dependencies [f8723b4]
- Updated dependencies [fd28b89]
  - @ggsvelte/spec@0.9.0

## 0.8.0

### Minor Changes

- 43e05b8: # Complete mapped style aesthetics

  Add complete mapped size, linewidth, alpha, shape, and linetype scale plumbing across strict authoring helpers, grouping, stats, SVG/Canvas/SSR rendering, style-aware legends, inspection, and hit testing.

  Discrete and binned style mappings now participate in implicit grouping. Review layered path geoms and add an explicit `group` mapping where style categories are descriptive rather than structural. Mapped `alpha` is the complete opacity aesthetic rather than a value multiplied by a scalar geom `alpha`; set the scale range to bound mapped opacity.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-7-to-0-8>

- afaaeeb: <!-- markdownlint-disable MD041 -->

  feat: add geom ribbon for precomputed interval bands (x+ymin+ymax or y+xmin+xmax)

  Migration: none — additive

- fcc8ad0: # Responsive guide presentation

  Add strict scale-local and top-level guide APIs, responsive right/bottom guide layout, semantically safe discrete-guide merging, guide theme roles, and merged legend interactions.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-7-to-0-8>

- 737ca85: # Add geom rect, tile, and raster to PortableSpec and all renderers

  Migration: none — additive

  - `rect` maps arbitrary regions with `xmin`/`xmax`/`ymin`/`ymax`
  - `tile` draws center-sized cells (band or continuous) with optional width/height
  - `raster` draws equal-cell dense grids with fill and no per-cell stroke
  - Builder: `geomRect` / `geomTile` / `geomRaster`; Svelte: `<GeomRect>` / `<GeomTile>` / `<GeomRaster>`
  - Mapped color outlines use `strokes[]` on rect batches; tile/raster use center candidate anchors

### Patch Changes

- 2efb5b2: <!-- markdownlint-disable MD041 -->

  refactor: split style scale resolver into collect, discrete, numeric, and finite modules

- Updated dependencies [43e05b8]
- Updated dependencies [afaaeeb]
- Updated dependencies [fcc8ad0]
- Updated dependencies [737ca85]
  - @ggsvelte/spec@0.8.0

## 0.7.1

### Patch Changes

- 42b031a: <!-- markdownlint-disable MD041 -->

  perf: O(K) band thinning overlap after one pos-sort

  Rotated band label thinning sorts projections once per angle then reuses the
  sorted list (filter by every-k). neighbourOverlap accepts alreadySorted for
  temporal re-checks.

- c4d6b6c: <!-- markdownlint-disable MD041 -->

  perf: O(K·D)→O(K+D) band break domainIndex via encodeKey map

  Explicit band scale breaks resolve domain indices with a first-occurrence
  `encodeKey` map (trainBand identity), including signed zero and typed 1/"1".
  Band break lists are also deduped in O(K) in layoutDomain.

- bbe65c7: <!-- markdownlint-disable MD041 -->

  feat: author `scales.*.guide` pins for band axis label layout

  Optional `{ mode, angle, wrap }` on position scales locks categorical label
  presentation (single / wrap / rotate / off) instead of auto-escalation.
  Advisories now point at `scales.x.guide` as the howToOverride surface.

- dc6c3fe: <!-- markdownlint-disable MD041 -->

  perf: one measureWidth per rotated band tick for height and overhang

  Rotated categorical axes measure each labeled tick once and reuse the width
  for both label-band height and end-anchored overhang.

- 7181580: <!-- markdownlint-disable MD041 -->

  perf: reuse band-axis wrap lines and widths on emit

  Wrapped categorical axes wrap and measure each label once, then reuse the
  cached lines/widths for overlap, side reserve, and tick emission.

- 7f38860: <!-- markdownlint-disable MD041 -->

  perf: Θ(R·B)→Θ(R) binned rect edges via xBinId

  Identity/count bar-col geometry on `type: "binned"` recovers bin edges from the
  stable integer `xBinId` (frame construction) instead of per-row
  `centers.findIndex` scans (B ≤ MAX_BINNED_BREAKS).

- b349179: <!-- markdownlint-disable MD041 -->

  refactor: extract candidate nearest-nav helpers

  Move closestOrthInRange / directionalNearestInOrder / panelRangeInOrder into
  candidate-geometry-nearest.ts. Re-exports keep existing import paths working.

- f66f44b: <!-- markdownlint-disable MD041 -->

  perf: O(C·n)→O(n) canvas point subset color batching

  Masked multi-color point draws bucket included indices by global first-seen
  color in one pass instead of re-scanning the batch for each of up to 64 colors.

- 1fa684e: <!-- markdownlint-disable MD041 -->

  fix: closed ribbons map coord semantic indices via emitted frame rows

  Area/density/smooth closed bands attach `closedFrameRows` for each
  pre-projection vertex so candidate frame-row resolve survives non-finite edge
  filtering under `coordTransform`.

- c422da0: <!-- markdownlint-disable MD041 -->

  refactor: split candidate spatial shortlist indexes from geometry refine

- a2c8da0: <!-- markdownlint-disable MD041 -->

  refactor: split non-position color families into manual, identity, and binned modules

- 94fdbec: <!-- markdownlint-disable MD041 -->

  refactor: split scale training into continuous, band, and color modules

- 6261ee1: <!-- markdownlint-disable MD041 -->

  refactor: extract bin break grids and co-locate stats R-parity suites

- f1b4a3d: <!-- markdownlint-disable MD041 -->

  refactor: split temporal preflight into field, annotation, and shared modules

- 8b9e95d: <!-- markdownlint-disable MD041 -->

  perf: prealloc typed buffers for errorbar segment emit

  Errorbars fill Float32Array/Uint32Array sized to 3 segments per row;
  dense reuses capacity-n buffers, sparse slices — no number[] +
  Float32Array.from double-copy.

- d591a18: <!-- markdownlint-disable MD041 -->

  perf: prealloc typed buffers for geom_text glyphs emit

  emitGlyphRows sizes Float32/Uint32 buffers to frame.n (like points/rects)
  and compacts only when marks are dropped — no number[] + Float32Array.from.

- 774f6de: <!-- markdownlint-disable MD041 -->

  perf: deriveGroups groupCount from Map size (no Math.max spread)

  Explicit and derived grouping return groupCount as the canonical Map size
  after the O(R) pass, avoiding a second full-array Math.max(...groups) that
  can RangeError on large row counts.

- ddc3cd8: <!-- markdownlint-disable MD041 -->

  refactor: modularize identity candidate datum resolver

  Split locate, series, and shared types out of datum.ts; keep a thin factory
  plus lineage/attribute assembly. Public re-exports preserve test import paths.

- dbdec68: <!-- markdownlint-disable MD041 -->

  perf: O(L)→O(log L) legend label measures via shared truncateToFit

  Discrete and steps legend entries truncate with binary-search keep length
  (same helper as axes/band guides), not a reverse linear measure scan.

- 80905dd: <!-- markdownlint-disable MD041 -->

  perf: O(R) band path x-sort keys (not per-comparator indexOf)

  line/area/smooth group sorts materialize band domain ranks once, then
  compare O(1); continuous x still sorts on `xNumeric` directly.

- 616bcc6: <!-- markdownlint-disable MD041 -->

  fix: geom_col/bar hover uses relative de-emphasis instead of a point ring

  Rect mark inspection no longer draws a circle hover/selection ring at the bar
  anchor. Sibling bars de-emphasize via interaction masks (including keyless
  charts via seed primitive focus). Point-like geoms keep circle chrome.

- 328ac7d: <!-- markdownlint-disable MD041 -->

  perf: prealloc rect emit buffers; single-pass grid major/minor split

  `emitRectRows` writes into preallocated Float32Array/Uint32Array (dense no-copy;
  sparse compact). Scene panel grid positions collect major/minor in one tick pass.

- 5cebbab: <!-- markdownlint-disable MD041 -->

  perf: unique-first resolution() O(R+U log U) for jitter/errorbar/bar width

  `resolution()` dedupes finite values before sorting so multiset columns cost
  O(R + U log U). Continuous geom_col bar width reuses the helper (gap 0 → 1).

- eeffbb6: <!-- markdownlint-disable MD041 -->

  perf: prealloc typed buffers for rule segment emit

  Data and annotation rule segments fill Float32Array/Uint32Array sized to
  max mark count; dense reuses buffers, sparse compact slices — no number[]

  - Float32Array.from double-copy.

- b278811: <!-- markdownlint-disable MD041 -->

  perf: O(1) summary/boxplot group×x lineage resolve via finite-y prefilter

  Build-time group×x buckets for summary/boxplot now store only finite-y source
  rows (with empty buckets when every y is non-finite), so candidate resolve
  returns the shared frozen array without per-mark y re-filtering or full-group
  clones. Count buckets are unchanged.

- 1428eb2: <!-- markdownlint-disable MD041 -->

  perf: skip per-group sort in stat_summary mean_se path

  `statSummary` only sorts (group,x) buckets when median is requested. Default
  mean_se and min/max/sum stay O(n) per combination.

- eeb5ce0: <!-- markdownlint-disable MD041 -->

  perf: O(P·B)→O(P+B) SVG panel batch routing via shared groupBatchesByPanel

  Faceted pure-SVG renders no longer re-scan every geometry batch for each panel.
  `groupBatchesByPanel` (issue #185) is pure and shared with the canvas stratum path.

- 4e4ec5b: <!-- markdownlint-disable MD041 -->

  perf: O(log L) ellipsis truncation via shared binary search

  `truncateToFit` binary-searches keep length (O(log L) measureWidth) and is
  shared by continuous layout and band-axis planners.

- 1f94c1c: <!-- markdownlint-disable MD041 -->

  fix: train uncensored natural baseline when scale domain pins censor

  `runPipeline` with `baselineScales` and explicit x/y domains now trains
  baseline domains from a second prepare/train pass without domain pins, so
  zoom-out references match full data extent (Svelte double-pass parity).

- Updated dependencies [bbe65c7]
- Updated dependencies [4e5b875]
- Updated dependencies [3f16ec8]
- Updated dependencies [e6d5f6f]
- Updated dependencies [72b01ee]
- Updated dependencies [6afccdc]
- Updated dependencies [c4f91d0]
- Updated dependencies [29f0565]
- Updated dependencies [1fed2f3]
- Updated dependencies [9a366cf]
- Updated dependencies [ec7f21b]
- Updated dependencies [a54932c]
- Updated dependencies [d1f69cb]
- Updated dependencies [9affbb6]
- Updated dependencies [571721f]
- Updated dependencies [f5a8919]
- Updated dependencies [09e6954]
- Updated dependencies [3231dc7]
  - @ggsvelte/spec@0.7.1

## 0.7.0

### Minor Changes

- ff4ad4c: # Generic color and fill scale families

  Add complete color/fill scale families with binding-identical color/colour helpers, transformed and temporal ramps, deterministic binned colorsteps, manual and identity mappings, explicit NA/unknown policies, and serializable discrete/colorbar/colorsteps GuidePlans.

  `RenderModel.guidePlans` is now a union: narrow on `plan.type === "axis"` before reading axis-only fields. Explicit continuous color domains censor out-of-domain values by default; set `oob: "squish"` to clamp. See the [0.6 to 0.7 migration guide](https://ggsvelte.sh/guide/upgrading#0-6-to-0-7).

  Migration: <https://ggsvelte.sh/guide/upgrading#0-6-to-0-7>

### Patch Changes

- c44f6bc: <!-- markdownlint-disable MD041 -->

  Measured categorical (band) x-axis label layout. Long `geom_col`/`geom_bar` category labels now wrap onto two lines, then rotate (−45°/−90°), instead of overlapping each other and the axis title — every bar keeps its label. When rotation still can't fit, labels truncate with the full text on the tick `<title>`, and a diagnostic suggests `coord_flip` for horizontal bars. The planner never auto-flips the chart and never thins a low-cardinality axis; vertical (coord_flip) categorical axes keep their existing behavior.

- Updated dependencies [c44f6bc]
- Updated dependencies [ff4ad4c]
  - @ggsvelte/spec@0.7.0

## 0.6.0

### Minor Changes

- 82b3a4d: # Pre-stat position transforms and positional scale families

  Add canonical identity, log10, and square-root position transforms; continuous and binned scale helpers with ggplot2 aliases; source-limit OOB policies; transformed-space stats/positions; semantic guides and interaction inversion; binned count/stack/dodge identities; and default 5% non-temporal expansion.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-5-to-0-6>

  Authored `type: "log"` now canonicalizes to `{ type: "linear", transform: "log10" }` and runs before statistics. Pinned domains censor before stats by default, position and numeric-bin parameters use transformed-space units, and trained/guide/interaction contracts report family `linear` plus `transform`. Use `expand: { mult: 0, add: 0 }` for flush bounds.

- 6b8f64b: # Post-stat coordinate transforms and curved topology

  Add canonical `coordTransform`/`coord_transform` APIs for independent identity, log10, and square-root coordinate projection after statistics; semantic coordinate limits and reversal; optional panel clipping; projected axes/grids; adaptive path and segment tessellation; and coordinate-before-scale interaction inversion.

  Migration: none — additive

  Coordinate transforms are intentionally distinct from scale transforms: use `scaleXLog10()` when statistics should consume log-space values, and `coordTransform({ x: "log10" })` when statistics should remain in scale space and only final geometry should be projected.

### Patch Changes

- b08c930: <!-- markdownlint-disable MD041 -->

  Split the canvas DOM paint path into concern-scoped modules (DPR/color helpers, mark drawers, stratum routing) with the published `@ggsvelte/core/dom` barrel and paint behavior unchanged.

- ed09958: <!-- markdownlint-disable MD041 -->

  Point package homepages and runtime diagnostic guidance at the canonical `https://ggsvelte.sh` documentation origin after the hosting cutover.

- Updated dependencies [82b3a4d]
- Updated dependencies [6b8f64b]
- Updated dependencies [cd7457c]
- Updated dependencies [ed09958]
  - @ggsvelte/spec@0.6.0

## 0.5.1

### Patch Changes

- 85f5b5a: <!-- markdownlint-disable MD041 -->

  Map scale-diagnostic severity onto the CLI stderr `kind` field 1:1 so error-severity diagnostics emit `kind: "error"` instead of being demoted to `warning`.

- Updated dependencies [85f5b5a]
  - @ggsvelte/spec@0.5.1

## 0.5.0

### Minor Changes

- 78c1942: # Temporal guide plans

  Add measured temporal axis plans with calendar-aligned automatic breaks, contextual and complete labels, explicit interval/minor-break controls, locale/timezone formatting, stable diagnostics, and per-panel `RenderModel.guidePlans` inspection.

  Migration: none — additive

### Patch Changes

- 087a4b1: <!-- markdownlint-disable MD041 -->

  Point published package metadata at the live documentation site and identify each package's monorepo directory.

- Updated dependencies [78c1942]
- Updated dependencies [087a4b1]
  - @ggsvelte/spec@0.5.0

## 0.4.0

### Minor Changes

- cfafdd1: # Temporal scale semantics

  Add strict, value-driven date and datetime scales across PortableSpec, fluent builder, and Svelte authoring. Raw four-digit year strings now infer a proportional UTC calendar axis after whole-column validation; ambiguous date orders and identifier-like values remain discrete until explicitly configured.

  Add deterministic named, exact-format, epoch, timezone, and DST-disambiguation parsers; parser-keyed immutable table views; structured scale decisions and diagnostics; ggplot2-style scale aliases; and lubridate-style authoring helpers. Preserve original source values for interactions while using semantic epoch values before stats, positions, scale training, and rendering.

  Migration: <https://ggsvelte.sh/guide/temporal-scales>

  If a four-digit string field is an identifier rather than a calendar year, set the position scale to `type: "band"`, call `scaleXDiscrete()` / `scaleYDiscrete()`, or use the equivalent snake_case alias. Ambiguous DMY/MDY input now requires an explicit parser such as `parse: "dmy"` or `parse: "mdy"`.

### Patch Changes

- 32c207a: # CLI reference parity

  Keep renderer CLI parsing, help output, and generated reference metadata backed by one option definition.

- Updated dependencies [cfafdd1]
  - @ggsvelte/spec@0.4.0

## 0.3.1

### Patch Changes

- 8b7d672: # Report the installed CLI version

  Add the `ggsvelte-render --version` runner contract while preserving SVG-only stdout and JSON Lines diagnostics for render commands.

- 437ff12: # Enforce theme and palette compatibility

  Reject named color schemes that do not match their ordinal or sequential scale type, and reject unsupported custom color syntax before rendering. When `type` is omitted, a named scheme now selects its ordinal or sequential family instead of being silently ignored or misused. Custom ranges accept `#rgb` and `#rrggbb`; three-digit stops normalize to lowercase six-digit hex so sequential interpolation cannot emit malformed colors.

  Migration: replace categorical schemes on sequential scales with `viridis` or a custom hex range; replace `viridis` on ordinal scales with a categorical scheme or custom hex range. Replace named or functional CSS colors in `scales.color.range` and `scales.fill.range` with equivalent `#rgb` or `#rrggbb` values.

- Updated dependencies [2b2f55c]
- Updated dependencies [437ff12]
  - @ggsvelte/spec@0.3.1

## 0.3.0

### Minor Changes

- b8dcf24: # Use CandidateStore for all hit resolution

  Add paint-ordered `CandidateStore.hitTest()` and route Svelte pointer inspection
  through the render model's existing lazy candidate index. Remove the experimental
  `buildHitIndex` and related `@ggsvelte/core/dom` types so interactive plots no
  longer build and retain a second geometry index.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-2-to-0-3>

- e4b02b5: # Delegate keyboard navigation to CandidateStore

  Let `CandidateStore.traverse()` apply modular sequential steps and preserve
  paint order for directional ties. Svelte inspection now delegates sequential,
  directional, and coincident keyboard navigation to the model-owned store
  without materializing a second candidate traversal list.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-2-to-0-3>

### Patch Changes

- 30db776: # Deepen Candidate construction

  Consolidate source-backed and identity-indexed Candidate construction behind one pipeline module seam while preserving CandidateStore behavior and performance contracts.

- Updated dependencies [f63e498]
- Updated dependencies [378f73c]
- Updated dependencies [0a7b872]
  - @ggsvelte/spec@0.3.0

## 0.2.0

### Minor Changes

- ce685ea: # Add linked interactive legend focus

  Add opt-in pointer, touch, and keyboard legend controls; stable-key emphasis
  propagation; renderer-neutral focus masks with SVG/canvas parity; 24-pixel
  legend targets; typed events and diagnostics; and a three-view example.

  Migration: none — additive

- 70b1070: # Add precise filtering and faceted intervals

  Filter discrete legend groups without changing their color identity, coordinate
  durable interval selections across facets with independent, union, or
  cross-panel semantics, and enter exact accessible selection or zoom bounds for
  linear, log, time, reversed, and band scales.

  Migration: none — additive

### Patch Changes

- f171d83: # Performance and hardening backfill

  Changelog backfill for the performance, bug-fix, and internal-architecture work
  merged between v0.1.1 and this release that did not carry individual
  changesets.

  Performance:

  - Stroked-path hit-testing resolves candidates through an edge AABB shortlist
    (O(log E + k) instead of scanning every edge).
  - Canvas segment strokes batch mirror points and render in Θ(runs); canvas
    accessibility rows are not materialised while the data table is closed.
  - Selection membership checks use parallel `Set`s (O(1) per key), and
    non-union interval walks fuse with a shared candidate projection.
  - Many further allocation and traversal reductions across scales, legends,
    facets, tooltips, and interaction controllers.

  Fixes:

  - Keyed `seedId` pin rebinds require a role match.
  - Legend filter chrome honors `--gg-tooltip-background` and preserves
    contrast; forced-colors paint is deterministic for disabled-at-SSR tool
    buttons.
  - Restored interval selections no longer hit an SSR temporal-dead-zone error.
  - Annotation frames stay rowless for `inputGroups`.

  Internals: source modules were split into smaller single-concern units
  (validate, normalize, error catalog, controllers) with no public API change.

- Updated dependencies [f171d83]
  - @ggsvelte/spec@0.2.0

## 0.1.1

### Patch Changes

- 6b3b581: # Installable registry dependencies

  Publish registry-compatible internal dependency ranges and verify release-shaped tarballs with npm, matching the actual Changesets publishing path.

- Updated dependencies [6b3b581]
  - @ggsvelte/spec@0.1.1

## 0.1.0

### Minor Changes

- c7aecaa: # First public release

  Publish the first public ggsvelte release: a Svelte 5 grammar of graphics with strong defaults, ggplot2-inspired themes and palettes, responsive bounded rendering, agent-friendly portable specs and diagnostics, hybrid SVG/canvas output, accessible opt-in inspection and brushing, complete interaction documentation, and a release-gated compatibility and quality matrix.

### Patch Changes

- Updated dependencies [c7aecaa]
  - @ggsvelte/spec@0.1.0
