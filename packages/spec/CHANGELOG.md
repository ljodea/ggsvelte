# @ggsvelte/spec

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

- fd28b89: <!-- markdownlint-disable MD041 -->

  fix: align temporal color censor recovery with runtime channel training

  parseFailure: "censor" on sequential/binned color now recovers from
  channel-wide training sources (sibling fields, scaled constants), parseable
  domain endpoints, and parseable binned breaks — matching collectColorChannelValues
  and sequential/binned train behavior.

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

## 0.7.1

### Patch Changes

- bbe65c7: <!-- markdownlint-disable MD041 -->

  feat: author `scales.*.guide` pins for band axis label layout

  Optional `{ mode, angle, wrap }` on position scales locks categorical label
  presentation (single / wrap / rotate / off) instead of auto-escalation.
  Advisories now point at `scales.x.guide` as the howToOverride surface.

- 4e5b875: <!-- markdownlint-disable MD041 -->

  Extract builder authoring data conversion into builder-data.ts and split the long temporal scale API tests into schema vs authoring files. Public builder exports are unchanged.

- 3f16ec8: <!-- markdownlint-disable MD041 -->

  Extract fluent builder geom option types and scale sugar into focused modules, and split position-scale schema vs helper tests. Public gg()/GGBuilder API is unchanged.

- e6d5f6f: <!-- markdownlint-disable MD041 -->

  Extract the pure LINT_CATALOG into lint-catalog.ts (error-catalog pattern) and split the long lint test suite into rules vs wiring files. Public lint imports are unchanged.

- 72b01ee: <!-- markdownlint-disable MD041 -->

  Split lintSpec into layer and scale rule modules, guard schema-invalid scale entries so lint never throws, and keep catalog source-scan coverage multi-file. Public lintSpec behavior is otherwise unchanged.

- 6afccdc: <!-- markdownlint-disable MD041 -->

  Split normalize scale and coordinate canonicalization into dedicated modules behind the existing normalize() entry. Public normalize/normalizeChannel exports and behavior are unchanged.

- c4f91d0: <!-- markdownlint-disable MD041 -->

  Split strict portability checks from lossy tooling conversion, with co-located tests. Public isPortable/toPortable/toPortableLossy surface is unchanged.

- 29f0565: <!-- markdownlint-disable MD041 -->

  Split scale authoring helpers into position and color modules with a thin facade, and split the long tier-2 validate suite by concern. Public scale-helper import paths and validation behavior are unchanged.

- 1fed2f3: <!-- markdownlint-disable MD041 -->

  Split temporal guides into interval grammar/labels and tick generation behind a stable temporal-guides facade. Public package exports and interval tick behavior are unchanged.

- 9a366cf: <!-- markdownlint-disable MD041 -->

  Split value-level temporal parsing into core, exact-format, and named-engine modules, and co-locate format plus tier-2 temporal scale tests. Public parseTemporal surface is unchanged.

- ec7f21b: <!-- markdownlint-disable MD041 -->

  Split temporal parsing into parse engines, column inference, and a thin authoring facade so domain edits do not require reading the full module. Public package exports and `./temporal.js` re-exports are unchanged.

- a54932c: <!-- markdownlint-disable MD041 -->

  Split the long temporal characterization suite into parse, column, and helpers test files co-located with the temporal production modules. No runtime behavior change.

- d1f69cb: <!-- markdownlint-disable MD041 -->

  Split tier-2 dataChecks into position, color, and shared temporal modules, and co-locate color data-aware validation tests. Public validate() behavior is unchanged.

- 9affbb6: <!-- markdownlint-disable MD041 -->

  Split tier-1 TypeBox error mapping into schema/path walk helpers and the agent SpecError mapper. Public validate() surface and error messages are unchanged.

- 571721f: <!-- markdownlint-disable MD041 -->

  Extract channel/DataRef form classification from the TypeBox error mapper and split temporal decision-reuse tier-2 tests into their own file. Public validate() behavior is unchanged.

- f5a8919: <!-- markdownlint-disable MD041 -->

  Split TypeBox path-group error mapping into union classification and keyword handlers. Public validate() agent diagnostics are unchanged.

- 09e6954: <!-- markdownlint-disable MD041 -->

  Extract tier-1 schema shape walks into a focused module with shared GEOM_BRANCHES, and co-locate temporal tier-2 tests with decision-reuse vs position-scale production modules. Public validate() behavior is unchanged.

- 3231dc7: <!-- markdownlint-disable MD041 -->

  Split data-free structural validation into layer, color-scheme, and facet modules behind a stable validate-structure barrel. Public validate() behavior is unchanged.

## 0.7.0

### Minor Changes

- ff4ad4c: # Generic color and fill scale families

  Add complete color/fill scale families with binding-identical color/colour helpers, transformed and temporal ramps, deterministic binned colorsteps, manual and identity mappings, explicit NA/unknown policies, and serializable discrete/colorbar/colorsteps GuidePlans.

  `RenderModel.guidePlans` is now a union: narrow on `plan.type === "axis"` before reading axis-only fields. Explicit continuous color domains censor out-of-domain values by default; set `oob: "squish"` to clamp. See the [0.6 to 0.7 migration guide](https://ggsvelte.sh/guide/upgrading#0-6-to-0-7).

  Migration: <https://ggsvelte.sh/guide/upgrading#0-6-to-0-7>

### Patch Changes

- c44f6bc: <!-- markdownlint-disable MD041 -->

  Measured categorical (band) x-axis label layout. Long `geom_col`/`geom_bar` category labels now wrap onto two lines, then rotate (−45°/−90°), instead of overlapping each other and the axis title — every bar keeps its label. When rotation still can't fit, labels truncate with the full text on the tick `<title>`, and a diagnostic suggests `coord_flip` for horizontal bars. The planner never auto-flips the chart and never thins a low-cardinality axis; vertical (coord_flip) categorical axes keep their existing behavior.

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

- cd7457c: <!-- markdownlint-disable MD041 -->

  Split the TypeBox schema module into name registries, ordered `$defs` declarations, pipeline catalogs, and a thin Cyclic/Module facade. Public exports and `schema/v0.json` are unchanged.

- ed09958: <!-- markdownlint-disable MD041 -->

  Point package homepages and runtime diagnostic guidance at the canonical `https://ggsvelte.sh` documentation origin after the hosting cutover.

## 0.5.1

### Patch Changes

- 85f5b5a: <!-- markdownlint-disable MD041 -->

  Map scale-diagnostic severity onto the CLI stderr `kind` field 1:1 so error-severity diagnostics emit `kind: "error"` instead of being demoted to `warning`.

## 0.5.0

### Minor Changes

- 78c1942: # Temporal guide plans

  Add measured temporal axis plans with calendar-aligned automatic breaks, contextual and complete labels, explicit interval/minor-break controls, locale/timezone formatting, stable diagnostics, and per-panel `RenderModel.guidePlans` inspection.

  Migration: none — additive

### Patch Changes

- 087a4b1: <!-- markdownlint-disable MD041 -->

  Point published package metadata at the live documentation site and identify each package's monorepo directory.

## 0.4.0

### Minor Changes

- cfafdd1: # Temporal scale semantics

  Add strict, value-driven date and datetime scales across PortableSpec, fluent builder, and Svelte authoring. Raw four-digit year strings now infer a proportional UTC calendar axis after whole-column validation; ambiguous date orders and identifier-like values remain discrete until explicitly configured.

  Add deterministic named, exact-format, epoch, timezone, and DST-disambiguation parsers; parser-keyed immutable table views; structured scale decisions and diagnostics; ggplot2-style scale aliases; and lubridate-style authoring helpers. Preserve original source values for interactions while using semantic epoch values before stats, positions, scale training, and rendering.

  Migration: <https://ggsvelte.sh/guide/temporal-scales>

  If a four-digit string field is an identifier rather than a calendar year, set the position scale to `type: "band"`, call `scaleXDiscrete()` / `scaleYDiscrete()`, or use the equivalent snake_case alias. Ambiguous DMY/MDY input now requires an explicit parser such as `parse: "dmy"` or `parse: "mdy"`.

## 0.3.1

### Patch Changes

- 2b2f55c: # Keep RuntimeSpec aligned with PortableSpec

  Project the runtime plot and layer types from their portable counterparts so
  portable fields such as `edition`, `facet`, `coord`, `a11y`, and layer `render`
  are visible through `RuntimeSpec`. Runtime-only `{ fn }` channel accessors remain
  type-level and conversion features; the rendering pipeline does not execute
  them.

- 437ff12: # Enforce theme and palette compatibility

  Reject named color schemes that do not match their ordinal or sequential scale type, and reject unsupported custom color syntax before rendering. When `type` is omitted, a named scheme now selects its ordinal or sequential family instead of being silently ignored or misused. Custom ranges accept `#rgb` and `#rrggbb`; three-digit stops normalize to lowercase six-digit hex so sequential interpolation cannot emit malformed colors.

  Migration: replace categorical schemes on sequential scales with `viridis` or a custom hex range; replace `viridis` on ordinal scales with a categorical scheme or custom hex range. Replace named or functional CSS colors in `scales.color.range` and `scales.fill.range` with equivalent `#rgb` or `#rrggbb` values.

## 0.3.0

### Patch Changes

- f63e498: # Compile plot schema validation

  Compile and reuse the plot schema validator so large inline datasets no longer block rendering during validation.

- 378f73c: # Preserve precise TypeBox union diagnostics

  Report extra channel and data keys against the active union form, reject named
  references inside inline-only dataset entries, and preserve the generic
  `SpecModule.Import` signature used by downstream TypeScript consumers.

- 0a7b872: # Migrate schema runtime from @sinclair/typebox 0.x LTS to typebox 1.x

  Replace the LTS `@sinclair/typebox` package with the active `typebox` 1.x line
  (same author; official Latest). Regenerates `schema/v0.json` and rewires
  runtime validation/error mapping for the 1.x Value API. PortableSpec shapes
  and the public validate()/builder surface are unchanged.

## 0.2.0

### Patch Changes

- f171d83: # Honor options.limits in standalone lintSpec, plus lint performance

  Standalone `lintSpec` previously always passed the default validate limits to
  field-evidence resolution, so raising or lowering `maxRows`/`maxBytes` via
  `options.limits` had no effect; it now merges `options.limits` the same way
  `validate()` does. Linting also short-circuits `isPortable` on the first issue
  and shares field evidence between data checks and lint instead of resolving it
  twice.

## 0.1.1

### Patch Changes

- 6b3b581: # Installable registry dependencies

  Publish registry-compatible internal dependency ranges and verify release-shaped tarballs with npm, matching the actual Changesets publishing path.

## 0.1.0

### Minor Changes

- c7aecaa: # First public release

  Publish the first public ggsvelte release: a Svelte 5 grammar of graphics with strong defaults, ggplot2-inspired themes and palettes, responsive bounded rendering, agent-friendly portable specs and diagnostics, hybrid SVG/canvas output, accessible opt-in inspection and brushing, complete interaction documentation, and a release-gated compatibility and quality matrix.
