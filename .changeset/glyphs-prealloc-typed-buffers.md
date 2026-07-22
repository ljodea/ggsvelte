---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: prealloc typed buffers for geom_text glyphs emit

emitGlyphRows sizes Float32/Uint32 buffers to frame.n (like points/rects)
and compacts only when marks are dropped — no number[] + Float32Array.from.
