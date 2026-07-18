# @ggsvelte/spec

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
