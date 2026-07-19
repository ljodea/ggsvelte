# @ggsvelte/spec

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
