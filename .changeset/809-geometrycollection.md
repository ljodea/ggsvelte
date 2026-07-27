---
"@ggsvelte/core": minor
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

feat: GeometryCollection expand for geom_sf (#809 phase 6)

Flatten GeoJSON GeometryCollection (recursively) to leaf point/line/polygon
geometries for draw and labels. Homogeneous collections render; mixed families
still raise sf-geometry-mixed. Compatible with even-odd holes and Multi* labels.

Migration: none — additive
