---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Post-stat coordinate transforms and curved topology

Add canonical `coordTransform`/`coord_transform` APIs for independent identity, log10, and square-root coordinate projection after statistics; semantic coordinate limits and reversal; optional panel clipping; projected axes/grids; adaptive path and segment tessellation; and coordinate-before-scale interaction inversion.

Migration: none — additive

Coordinate transforms are intentionally distinct from scale transforms: use `scaleXLog10()` when statistics should consume log-space values, and `coordTransform({ x: "log10" })` when statistics should remain in scale space and only final geometry should be projected.
