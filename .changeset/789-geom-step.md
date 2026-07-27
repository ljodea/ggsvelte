---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#789): first-class geom_step (hv / vh / mid)

Add `geom: "step"` with `params.direction` matching ggplot2 geom_step:
default `"hv"`, plus `"vh"` and `"mid"`. Surfaces: JSON/schema, builder
`.geomStep()`, and `<GeomStep />`. Step corner emission is shared across SVG,
canvas, and coord projection (`path-step.ts`). Existing `line` +
`curve: "step"` mid-style remains.

Migration: none — additive
