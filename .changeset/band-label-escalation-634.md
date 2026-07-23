---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: band x-label ladder prefers wrap / −45° over −90°+truncate (#634)

Auto categorical labels now (1) try balanced ≤2-line wraps when greedy
needs more lines, (2) check wrap collisions on top-aligned line planes
matching the renderer, and (3) pick −45° vs −90° from parallel-baseline
text clearance instead of AABB-vs-column false positives.

Migration: none — auto layout quality only; author guide pins unchanged
