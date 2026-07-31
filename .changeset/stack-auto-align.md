---
"@ggsvelte/core": minor
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): auto-align sparse stacked-area groups instead of rendering floating polygons

Stacked area groups whose continuous x samples skip an interior grid point
used to chord straight across the hole while the stack below varied,
rendering disembodied polygons — silently. The default identity path now
auto-applies the align stat (interpolate between a group's observed samples,
zero outside its range) and emits a new `stack-align-applied` advisory.

The rescue stands down — keeping today's geometry — when the x scale may
train discrete, when a group repeats an x value, or when the expansion would
exceed its budget (the new `stack-align-skipped` warning discloses that
case). Aligned frames keep source-row lineage for grid points that coincide
with observed samples, so hover/tooltip/keyboard inspection still reach real
data (this also lights up inspection on explicit `stat: "align"` layers).

Migration: none — additive (new diagnostic names; no existing surface changed).
