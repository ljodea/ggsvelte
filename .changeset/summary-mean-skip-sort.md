---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: skip per-group sort in stat_summary mean_se path

`statSummary` only sorts (group,x) buckets when median is requested. Default
mean_se and min/max/sum stay O(n) per combination.
