---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

# Drop Temporal polyfill from lean render bundles

Migration: none — additive public `ensureTemporalPolyfill` and lean-render size win.

Identity / numeric charts on `@ggsvelte/core/render` need no call-site change. Apps that parse non-UTC values from `@ggsvelte/spec` alone still get the polyfill via the public temporal facade (`parseTemporal`, column helpers) or `ensureTemporalPolyfill()`. Full `@ggsvelte/core` / `@ggsvelte/core/temporal` and agent `validate()` also register it.

The polyfill is no longer a static import on the shared parse foundation. Lean client graphs keep ISO/UTC calendar helpers without shipping Temporal + jsbi (~50KB+ gzip).
