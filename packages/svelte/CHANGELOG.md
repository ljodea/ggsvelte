# @ggsvelte/svelte

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

  Migration: <https://ljodea.github.io/ggsvelte/guide/upgrading#0-1-to-0-2>

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

  Migration: <https://ljodea.github.io/ggsvelte/guide/upgrading#0-1-to-0-2>

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
