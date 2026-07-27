---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_density_2d + stat_density_2d KDE isolines (#802)

Add `geom: "density_2d"` (default `stat: "density_2d"`) for bivariate product
Gaussian KDE isolines. Bandwidth MASS bandwidth.nrd then kde2d h/4 (or
`params.h`); grid `n`×`n` (default 100) over a 5%-expanded data range;
levels via breaks / binwidth / bins. Clean-room MS via shared contour
helpers. Builder `.geomDensity2d()` and Svelte `<GeomDensity2d />`.

v1: open polylines only — no density_2d_filled, no weights, no contour_var
other than density. Groups with fewer than two points are dropped with a
warning.

Migration: none — additive
