---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: geom_sf_label boxed SF labels (#809 phase 3)

Add `geom_sf_label`: labels at `stat_sf_coordinates` representative points with
a measured rounded background box. `color` is ink + box stroke; `fill` is the
box background. Params: padding, radius, linewidth, size, anchor, dx/dy.

Builder `.geomSfLabel()` and Svelte `<GeomSfLabel />`. GlyphsBatch optional box
fields; SVG draws rect then text; hit uses box AABB. Shared path for future
`geom_label` (#792).

Migration: none — additive
