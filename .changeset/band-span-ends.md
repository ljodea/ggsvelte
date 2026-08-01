---
"@ggsvelte/core": patch
---

# Read a band selection's ends without mapping every key

Migration: none — internal

`SemanticViewport.resolve` reports the first and last selected values on a band
axis. It got them by mapping the whole key list first, and the map allocated a
short-lived array per key — so reading two values from an N-key selection cost
about N allocations.

Scan inward from each end instead. Allocations drop from N to none, and a
selection whose outermost keys are on the axis now stops after two lookups
rather than N. Worst case, where few keys land on the axis, still walks the
list once.

N is caller-supplied and in-tree comes from the interval brush, bounded by the
number of categories on the axis.
