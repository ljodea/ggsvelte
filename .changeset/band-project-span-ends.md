---
"@ggsvelte/core": patch
---

# Band interval project() normalizes only domain extremes

Migration: none — identical projected spans for contiguous and non-contiguous
band selections; lower cost on large category brushes.

`projectedSpan` used to call `scale.normalize` for every selected key to find
min/max centers. Centers are monotone in domain index, so it now tracks the
extreme indices in one pass and normalizes only those two values.
