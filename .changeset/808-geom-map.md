---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_map fortified region join for choropleths (#808)

Add ggplot2-style `map` geom: join a fortified map table to value rows via
`aes.map_id` and `params.map` / `params.mapId`. Coordinates from map
`long`+`lat` or `x`+`y`; optional multipoly `group`. Renders closed filled
paths per region; missing regions drop with `map-region-missing` warning.

Intentional subset: no network fetches, no sf/CRS, no public geom_polygon.

Migration: none — additive
