---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): honor strokePaint and glow on segment, rule, and spoke

`SegmentParams`, `RuleParams`, and `SpokeParams` already declared `strokePaint`
and `glow`, and `SegmentsBatch` already had slots for both, but packing never
called `layerPaintFromParams`. Authored gradients and glow validated then
disappeared. Shared segment packing now resolves paint the way line/curve/ribbon
do, SVG and canvas draw it, and solid fallbacks land when stroke is otherwise
null.

Migration: none — params that previously did nothing now render
