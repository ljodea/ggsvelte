---
"@ggsvelte/core": patch
---

# Draw constant-size canvas circles without per-point style objects

Migration: none — internal. Same `moveTo` + `arc` + batched fill commands.

The competitive colored scatter path allocated a geometry object per point via `resolvePointMark`. Filled circles of one size now write the path commands directly.
