---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": patch
---

<!-- markdownlint-disable MD041 -->

feat: circle-open point shape (unfilled ring)

Add `"circle-open"` to the point shape registry (ggplot2 shape 1): an
unfilled ring stroked in the mark's color channel, stroke width
max(1, size/3). Available as a scalar `params.shape`, as a shape-scale
range value, and through the shared `pointShapeGeometry` table, so SVG,
canvas, and both legend renderers draw it consistently. Interaction hit-
testing treats it as a circle of the same size.

Appended to `POINT_SHAPE_NAMES` (not inserted), so default discrete shape
assignments for domains of ≤ 6 levels are unchanged; a 7th level now assigns
circle-open instead of throwing/cycling one level earlier.

Migration: none — additive
