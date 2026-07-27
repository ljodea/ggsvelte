---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: resolve polygon-ring hits to their own frame row (#916)

Hits on closed filled rings (`geom_density_2d_filled`, `geom_polygon`,
`geom_sf`) resolved through the x-sorted 2×N band reconstruction whenever no
coord transform was active, so a vertex could report a neighbouring ring's
row — and with it the wrong `after_stat(level)` / `after_stat(density)`.
Candidate resolution now prefers the exact per-vertex rows the geometry already
emits (`closedFrameRows`) for every closed path, not only after coord
projection.

Migration: none — hit resolution only
