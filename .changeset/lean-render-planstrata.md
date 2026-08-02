---
"@ggsvelte/core": minor
---

# Export planStrata from the lean render entry

Migration: additive — `@ggsvelte/core/render` now re-exports `planStrata` and
the `Stratum` type. Canvas-mark charts can compose
`runPipeline` + `planStrata` (lean) with `drawStratum`
(`@ggsvelte/core/dom`) without importing the full `@ggsvelte/core` barrel,
which installs the Temporal polyfill on import. Measured on the competitive
canvas scatter entry: 237.7 → 144.7 KB gzip (−39%).
