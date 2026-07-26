---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: geom_density_2d_filled closed KDE rings (#802 phase 2)

Add `geom: "density_2d_filled"` / `stat: "density_2d_filled"` with builder
`.geomDensity2dFilled()` and Svelte `<GeomDensity2dFilled />`. Same product
Gaussian KDE as density_2d; closed isoline rings become filled paths. Open
rings are dropped with a warning. Fill defaults to `after_stat(level)` via
`ColorBinding.statColumn`.

Migration: none — additive
