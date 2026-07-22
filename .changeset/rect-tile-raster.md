---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add geom rect, tile, and raster to PortableSpec and all renderers

- `rect` maps arbitrary regions with `xmin`/`xmax`/`ymin`/`ymax`
- `tile` draws center-sized cells (band or continuous) with optional width/height
- `raster` draws equal-cell dense grids with fill and no per-cell stroke
- Builder: `geomRect` / `geomTile` / `geomRaster`; Svelte: `<GeomRect>` / `<GeomTile>` / `<GeomRaster>`
- Mapped color outlines use `strokes[]` on rect batches; tile/raster use center candidate anchors
