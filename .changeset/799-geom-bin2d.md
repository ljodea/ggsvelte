---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add geom_bin_2d + stat_bin_2d heatmap (#799)

2D rectangular binning with after_stat `fill=count` by default (ggplot2
`geom_bin2d` / `stat_bin_2d`). Reuses edge-rect geometry and 1D break helpers.

- PortableSpec: `geom: "bin_2d"` / `stat: "bin_2d"` with `params.bins`,
  `binwidth`, and `drop`
- Builder: `.geomBin2d()`; Svelte: `<GeomBin2d />`
- Color binding accepts after_stat columns (`count`, `density`, `ncount`,
  `ndensity`) for fill

Migration: none — additive
