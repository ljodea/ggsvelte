---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add geom_path — data-order polylines (#788)

ggplot2 `geom_path` connects observations in row/data order within each group (no x-sort). `geom_line` continues to sort by x.

- PortableSpec: `geom: "path"` (PathLayer, same params as line)
- Builder: `.geomPath()`; Svelte: `<GeomPath />`
- Core: reuses line path batch builder with `sortByX: false`

Migration: none — additive
