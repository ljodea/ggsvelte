---
"@ggsvelte/core": patch
---

# Batch paint-vector resolution in geometry emitters

Migration: none — same stroke and fill colours; fewer paint-vector calls and allocations per batch.

Geometry emitters that already accumulate style-row indices now resolve colour once per batch instead of once per item (segments, line subpaths, curves, polygons, ribbons, area/density groups).
