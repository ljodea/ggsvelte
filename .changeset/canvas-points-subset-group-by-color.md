---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(C·n)→O(n) canvas point subset color batching

Masked multi-color point draws bucket included indices by global first-seen
color in one pass instead of re-scanning the batch for each of up to 64 colors.
