# @ggsvelte/core

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
