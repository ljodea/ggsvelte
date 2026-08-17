---
"@ggsvelte/core": minor
---

Add `registerDefaultOrdinalColor()` for headless charts that use the built-in categorical palette or an explicit range. This registration keeps named categorical, ColorBrewer, sequential, and Crameri catalogs out of lean bundles; use `registerOrdinalColor()` when a spec selects a named scheme.

Migration: none — additive.
