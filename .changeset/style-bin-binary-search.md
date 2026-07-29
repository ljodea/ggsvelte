---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): O(log B) style bin lookup for binned size/shape/group

Binned style scales and style-driven grouping used linear findIndex over
break edges on every mapped row. styleBinIndex binary-searches the same
left-closed contract (B ≤ 64). Color binned scales already did this.

Migration: none — internal speedup only
