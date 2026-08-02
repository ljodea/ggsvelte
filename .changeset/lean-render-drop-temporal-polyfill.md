---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

# Drop Temporal polyfill from lean render bundles

Migration: none for identity / numeric charts on `@ggsvelte/core/render`. Apps that parse non-UTC temporal values from `@ggsvelte/spec` alone still get the polyfill via the public temporal facade (`parseTemporal`, column helpers) or `ensureTemporalPolyfill()`. Full `@ggsvelte/core` / `@ggsvelte/core/temporal` and agent `validate()` also register it.

New public export: `ensureTemporalPolyfill` (for advanced call sites that use temporal ticks/guides without the parse facade).

The polyfill is no longer a static import on the shared parse foundation. Lean client graphs keep ISO/UTC calendar helpers without shipping Temporal + jsbi (~50KB+ gzip).
