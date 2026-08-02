---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
---

# Drop Temporal polyfill from lean render bundles

Migration: none for identity / numeric charts on `@ggsvelte/core/render`. Full temporal (non-UTC zones, agent `validate()`, `@ggsvelte/core` / `@ggsvelte/core/temporal`) still loads `@js-temporal/polyfill` via `ensureTemporalPolyfill()`.

The polyfill is no longer a static import on the shared parse foundation. Lean client graphs keep ISO/UTC calendar helpers without shipping Temporal + jsbi (~50KB+ gzip).
