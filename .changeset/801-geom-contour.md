---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_contour + stat_contour isolines (#801)

Add `geom: "contour"` (default `stat: "contour"`) for open isoline polylines
over a regular continuous x×y×z grid. Levels from `params.breaks`,
`binwidth`, or `bins` (default 10, min..max inclusive). Clean-room marching
squares (no R/C++). Builder `.geomContour()` and Svelte `<GeomContour />`.

v1: open path polylines only; no contour_filled / irregular triangulation /
default color-by-level. Incomplete grid cells are skipped; groups without a
usable grid or levels are dropped with a warning.

Migration: none — additive
