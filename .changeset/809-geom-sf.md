---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: geom_sf portable GeoJSON geometries phase 1 (#809)

Add `geom: "sf"` for already-projected GeoJSON Geometry values stored as JSON
strings in a data column (default `geometry`). Point/LineString/Polygon and
their Multi* variants expand to points, open paths, or closed filled rings.
Interior rings emit a warning; GeometryCollection and mixed families error.

Builder `.geomSf()` and Svelte `<GeomSf />`. No CRS / `coord_sf` in this phase.

Migration: none — additive
