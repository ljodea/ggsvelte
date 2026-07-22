---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: prealloc typed buffers for rule segment emit

Data and annotation rule segments fill Float32Array/Uint32Array sized to
max mark count; dense reuses buffers, sparse compact slices — no number[]

- Float32Array.from double-copy.
