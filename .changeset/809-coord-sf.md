---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: coord_sf fixed-aspect maps for already-projected data (#809 phase 8)

Add PortableSpec `{ type: "sf", ratio? }` reusing coord_fixed layout for geom_sf
maps. Public helpers `coordSf` / `coord_sf`, builder `.coordSf()`, and
`<CoordSf>`. No CRS reproject or graticules in v1.

Migration: none — additive
