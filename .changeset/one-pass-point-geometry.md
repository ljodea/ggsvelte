---
"@ggsvelte/core": patch
---

# Pack continuous scatter points in one pass

Migration: none — internal. Same pixels, dropped rows, and source row indexes. Band scales and positional offsets still use the two-pass collector.

Continuous identity scatter no longer allocates intermediate normalized x/y buffers. Normalize, drop non-finite positions, and write pixel coords in one loop — the same shape as the multi-series line hot path.
