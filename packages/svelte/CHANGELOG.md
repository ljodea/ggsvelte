# @ggsvelte/svelte

## 0.7.1

### Patch Changes

- 616bcc6: <!-- markdownlint-disable MD041 -->

  fix: geom_col/bar hover uses relative de-emphasis instead of a point ring

  Rect mark inspection no longer draws a circle hover/selection ring at the bar
  anchor. Sibling bars de-emphasize via interaction masks (including keyless
  charts via seed primitive focus). Point-like geoms keep circle chrome.

- Updated dependencies [42b031a]
- Updated dependencies [c4d6b6c]
- Updated dependencies [bbe65c7]
- Updated dependencies [dc6c3fe]
- Updated dependencies [7181580]
- Updated dependencies [7f38860]
- Updated dependencies [b349179]
- Updated dependencies [f66f44b]
- Updated dependencies [1fa684e]
- Updated dependencies [c422da0]
- Updated dependencies [a2c8da0]
- Updated dependencies [94fdbec]
- Updated dependencies [6261ee1]
- Updated dependencies [f1b4a3d]
- Updated dependencies [8b9e95d]
- Updated dependencies [d591a18]
- Updated dependencies [774f6de]
- Updated dependencies [ddc3cd8]
- Updated dependencies [dbdec68]
- Updated dependencies [80905dd]
- Updated dependencies [616bcc6]
- Updated dependencies [328ac7d]
- Updated dependencies [5cebbab]
- Updated dependencies [eeffbb6]
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
- Updated dependencies [b278811]
- Updated dependencies [1428eb2]
- Updated dependencies [eeb5ce0]
- Updated dependencies [4e4ec5b]
- Updated dependencies [1f94c1c]
  - @ggsvelte/core@0.7.1
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
  - @ggsvelte/core@0.7.0

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

- 47d9ddd: <!-- markdownlint-disable MD041 -->

  Collapse identical default-tooltip field blocks for multi-layer inspect (line + point) without changing the public inspection member list.

- ed09958: <!-- markdownlint-disable MD041 -->

  Point package homepages and runtime diagnostic guidance at the canonical `https://ggsvelte.sh` documentation origin after the hosting cutover.

- Updated dependencies [82b3a4d]
- Updated dependencies [6b8f64b]
- Updated dependencies [cd7457c]
- Updated dependencies [b08c930]
- Updated dependencies [ed09958]
  - @ggsvelte/spec@0.6.0
  - @ggsvelte/core@0.6.0

## 0.5.1

### Patch Changes

- 85f5b5a: <!-- markdownlint-disable MD041 -->

  Map scale-diagnostic severity onto the CLI stderr `kind` field 1:1 so error-severity diagnostics emit `kind: "error"` instead of being demoted to `warning`.

- Updated dependencies [85f5b5a]
  - @ggsvelte/spec@0.5.1
  - @ggsvelte/core@0.5.1

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
  - @ggsvelte/core@0.5.0

## 0.4.0

### Minor Changes

- cfafdd1: # Temporal scale semantics

  Add strict, value-driven date and datetime scales across PortableSpec, fluent builder, and Svelte authoring. Raw four-digit year strings now infer a proportional UTC calendar axis after whole-column validation; ambiguous date orders and identifier-like values remain discrete until explicitly configured.

  Add deterministic named, exact-format, epoch, timezone, and DST-disambiguation parsers; parser-keyed immutable table views; structured scale decisions and diagnostics; ggplot2-style scale aliases; and lubridate-style authoring helpers. Preserve original source values for interactions while using semantic epoch values before stats, positions, scale training, and rendering.

  Migration: <https://ggsvelte.sh/guide/temporal-scales>

  If a four-digit string field is an identifier rather than a calendar year, set the position scale to `type: "band"`, call `scaleXDiscrete()` / `scaleYDiscrete()`, or use the equivalent snake_case alias. Ambiguous DMY/MDY input now requires an explicit parser such as `parse: "dmy"` or `parse: "mdy"`.

### Patch Changes

- f9d62dc: # Temporal agent guidance

  Clarify temporal parser and override behavior in the packaged ggsvelte agent skill.

- Updated dependencies [cfafdd1]
- Updated dependencies [32c207a]
  - @ggsvelte/spec@0.4.0
  - @ggsvelte/core@0.4.0

## 0.3.1

### Patch Changes

- 8b7d672: # Harden the responsive Quickstart path

  Make declaration-only layers server-render on the supported Svelte floor, apply `ariaLabel` to static chart output, commit responsive width and readiness together after collapsed containers recover, and expose the installed package version through `ggsvelte-render --version`.

- Updated dependencies [8b7d672]
- Updated dependencies [2b2f55c]
- Updated dependencies [437ff12]
  - @ggsvelte/core@0.3.1
  - @ggsvelte/spec@0.3.1

## 0.3.0

### Patch Changes

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

- 57e4c85: # Internalize plot interaction assembly

  Internalize controller construction, deferred sibling wiring, shared Candidate
  projection, and lifecycle registration in a deep plot-interaction assembly module.

- 5d95948: # Own semantic Candidate projection once

  Move semantic Candidate traversal, liveness gating, anchor projection, interaction masks, and interval-consumption shaping behind one runtime module seam.

- Updated dependencies [f63e498]
- Updated dependencies [b8dcf24]
- Updated dependencies [30db776]
- Updated dependencies [e4b02b5]
- Updated dependencies [378f73c]
- Updated dependencies [0a7b872]
  - @ggsvelte/spec@0.3.0
  - @ggsvelte/core@0.3.0

## 0.2.1

### Patch Changes

- d724578: # Update the packaged agent skill for v0.2

  Document linked interaction controllers, legend focus and filtering, faceted
  intervals, exact bounds, and the current Svelte peer requirement.

## 0.2.0

### Minor Changes

- ce685ea: # Add linked interactive legend focus

  Add opt-in pointer, touch, and keyboard legend controls; stable-key emphasis
  propagation; renderer-neutral focus masks with SVG/canvas parity; 24-pixel
  legend targets; typed events and diagnostics; and a three-view example.

  Migration: none — additive

- 1fc7b4d: # Add semantic linked-view interaction state

  Add `createPlotInteraction`, controlled selection and zoom, presentation-only
  emphasis, stable semantic scopes, explicit key reconciliation, and a complete
  linked plots-controls-table example.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-1-to-0-2>

- 70b1070: # Add precise filtering and faceted intervals

  Filter discrete legend groups without changing their color identity, coordinate
  durable interval selections across facets with independent, union, or
  cross-panel semantics, and enter exact accessible selection or zoom bounds for
  linear, log, time, reversed, and band scales.

  Migration: none — additive

- 98df82b: # Raise the Svelte peer floor to 5.33.1

  The `svelte` peer range narrows from `^5.29.0` to `^5.33.1`. Svelte 5.33.1
  restored lazy server-side `$derived` evaluation (sveltejs/svelte#15964), so
  the library no longer carries wiring constraints for the 5.29 eager behavior.
  Only the eager-derived declaration constraint is removed — internal controller
  construction order and effect-registration order are unchanged. Consumers on
  Svelte 5.29.0–5.33.0 must upgrade Svelte to take this release.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-1-to-0-2>

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

- 9de8100: # Advise on silently-inert interaction wiring

  Two new advisory diagnostics (ADR 0013 ambiguity audit): `interactionScope`
  without an `interaction` controller is ignored and now says so, and an
  interaction handler (`oninspect`/`onselect`/`onzoom`/`onlegendfocus`/
  `onlegendfilter`) whose capability prop is not enabled never fires and now
  says so. Both are delivered once per prop per plot instance through the
  existing `ondiagnostic` channel (dev-only console fallback) and never change
  behavior. The passive controller-consumer pattern stays advisory-free.

  Migration: none — additive

- Updated dependencies [ce685ea]
- Updated dependencies [f171d83]
- Updated dependencies [70b1070]
- Updated dependencies [f171d83]
  - @ggsvelte/core@0.2.0
  - @ggsvelte/spec@0.2.0

## 0.1.1

### Patch Changes

- 6b3b581: # Installable registry dependencies

  Publish registry-compatible internal dependency ranges and verify release-shaped tarballs with npm, matching the actual Changesets publishing path.

- Updated dependencies [6b3b581]
  - @ggsvelte/spec@0.1.1
  - @ggsvelte/core@0.1.1

## 0.1.0

### Minor Changes

- c7aecaa: # First public release

  Publish the first public ggsvelte release: a Svelte 5 grammar of graphics with strong defaults, ggplot2-inspired themes and palettes, responsive bounded rendering, agent-friendly portable specs and diagnostics, hybrid SVG/canvas output, accessible opt-in inspection and brushing, complete interaction documentation, and a release-gated compatibility and quality matrix.

### Patch Changes

- Updated dependencies [c7aecaa]
  - @ggsvelte/spec@0.1.0
  - @ggsvelte/core@0.1.0
