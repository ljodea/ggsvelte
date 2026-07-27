---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(svelte): CAP-sized heap for canvas a11y table row select

Opening the canvas a11y table no longer fully sorts every distinct source-row
index. Keep a max-heap of the CAP smallest indexes that materialise so cost is
O(R log CAP) instead of O(R log R) when R ≫ 100.
