---
"@ggsvelte/core": patch
---

# Hoist per-iteration invariants in stats and frame helpers

Migration: none — identical stat output and facet panel order.

Hoist `Object.keys` / column resolution / encode-band keys above hot loops, store hex-bin cell coords at insert time, and drop the redundant all-true contour mask (#1312).
