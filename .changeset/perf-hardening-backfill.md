---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Performance and hardening backfill

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
