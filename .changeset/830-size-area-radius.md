---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add size area / radius scale family (#830)

- `sizeUnit`: `"area"` (default continuous), `"radius"` (linear), `"area_zero"` (zero→zero area)
- Helpers: `scaleSizeArea` / `scaleSizeBinnedArea` / `scaleRadius` / `scaleSizeOrdinal` + snake aliases; bare `scale_size`
- `maxSize` option on area helpers (default 6) when `range` is omitted
- Svelte: `<ScaleSizeArea />`, `<ScaleSizeBinnedArea />`, `<ScaleRadius />`, `<ScaleSizeOrdinal />`
- Range values may be 0 so zero-area bubbles are portable

Migration: none — additive
