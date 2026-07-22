---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(log L) ellipsis truncation via shared binary search

`truncateToFit` binary-searches keep length (O(log L) measureWidth) and is
shared by continuous layout and band-axis planners.
