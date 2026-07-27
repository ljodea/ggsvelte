---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add geom_hex / stat_bin_hex — hexagonal bin heatmap (#800)

ggplot2-compatible 2D hexagonal binning heatmap:

- Stat `bin_hex`: pointy-top axial lattice; fill defaults to after_stat count
- Geometry: one closed path subpath per occupied hex
- Surfaces: PortableSpec, `.geomHex()`, `<GeomHex />`
- Params (v1): `bins` (default 30), `drop` (default true), `alpha`, `linewidth`

Migration: none — additive
