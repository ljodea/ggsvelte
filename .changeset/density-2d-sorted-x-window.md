---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): density_2d KDE uses a sorted-x sliding window

Product-Gaussian grid evaluation sorts samples by x once and slides an
x-window across each grid row, so far-away points are not examined when
bandwidth is local. Same ±8σ product kernel and isoline path as before.

Migration: none — internal speedup only
