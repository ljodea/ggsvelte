---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(R) band path x-sort keys (not per-comparator indexOf)

line/area/smooth group sorts materialize band domain ranks once, then
compare O(1); continuous x still sorts on `xNumeric` directly.
