---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: geom_sf_text + stat_sf_coordinates labels (#809 phase 2)

Add `stat_sf_coordinates` (one representative (x,y) per GeoJSON feature) and
`geom_sf_text` which defaults to that stat and draws `aes.label` at the point.
Point as-is; MultiPoint/LineString vertex mean; Polygon exterior shoelace
centroid; Multi* uses the first component only in v1.

Builder `.geomSfText()` and Svelte `<GeomSfText />`. Requires `aes.label`;
geometry still as JSON strings in a data column.

Migration: none — additive
