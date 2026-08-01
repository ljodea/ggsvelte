---
"@ggsvelte/core": patch
---

# Window polygon hole rings instead of rescanning the batch

Migration: none — internal

Every consumer of `PathsBatch.ringStarts` scanned the whole batch-wide array to
find the ring breaks inside one subpath, so a filled polygon batch with S
subpaths and R hole rings paid O(S x R) per SVG render, per canvas frame, and
per pointer probe. A shared `ringCuts` helper binary-searches the window
instead, giving O(log R + k) per subpath.

The `ringStarts` ascending order is now documented on `PathsBatch` and on the
exported `pathData` — rings come from consecutive cut pairs, so consumers
already depended on it.
