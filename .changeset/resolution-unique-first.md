---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: unique-first resolution() O(R+U log U) for jitter/errorbar/bar width

`resolution()` dedupes finite values before sorting so multiset columns cost
O(R + U log U). Continuous geom_col bar width reuses the helper (gap 0 → 1).
