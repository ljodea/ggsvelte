---
"@ggsvelte/core": patch
---

# Window polygon hole rings instead of rescanning the batch

Migration: none — internal, except a narrowed input contract on `pathData`

SVG serialization, canvas tracing, and the coord hole remap each scanned the
whole batch-wide `PathsBatch.ringStarts` array to find the ring breaks inside
one subpath. A shared `ringCuts` helper binary-searches the window instead, so
a batch with S filled subpaths and R hole rings drops from O(S x R) to
O(S log R) per SVG render and per canvas frame. Hit testing got the same search
inline in #1301; it now shares the helper.

This only bites maps whose parts carry holes: with no holes the batch omits
`ringStarts` and every call site short-circuits ahead of the helper. Where holes
are common, R grows with S — 3000 counties with a lake each cost 9 million
compares per frame before.

`ringStarts` ascending order is now documented on `PathsBatch` and on the
exported `pathData`. Both producers emit it ascending, so every in-tree caller
is unaffected. A caller hand-building an unsorted array for `pathData` used to
get its out-of-order breaks anyway (paired into the wrong rings); those breaks
are now dropped instead.
