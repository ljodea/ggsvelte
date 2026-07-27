---
"@ggsvelte/core": minor
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

feat: geom_sf polygon holes via even-odd rings (#809 phase 4)

Interior GeoJSON rings are drawn as even-odd holes (SVG/canvas/hit-test).
Removes the `sf-holes-ignored` warning. No CRS/coord_sf yet.

Migration: none — additive
