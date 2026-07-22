---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: prealloc typed buffers for errorbar segment emit

Errorbars fill Float32Array/Uint32Array sized to 3 segments per row;
dense reuses capacity-n buffers, sparse slices — no number[] +
Float32Array.from double-copy.
