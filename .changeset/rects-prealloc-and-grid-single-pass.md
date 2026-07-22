---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: prealloc rect emit buffers; single-pass grid major/minor split

`emitRectRows` writes into preallocated Float32Array/Uint32Array (dense no-copy;
sparse compact). Scene panel grid positions collect major/minor in one tick pass.
