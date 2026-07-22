---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: prealloc typed buffers for geom_text glyph emit

Text geometry fills Float32Array/Uint32Array (and string arrays) of length n
once; dense frames reuse buffers without Float32Array.from double-copy;
sparse frames compact with slice.
