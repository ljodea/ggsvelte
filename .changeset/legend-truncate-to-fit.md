---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(L)→O(log L) legend label measures via shared truncateToFit

Discrete and steps legend entries truncate with binary-search keep length
(same helper as axes/band guides), not a reverse linear measure scan.
