---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: reuse band-axis wrap lines and widths on emit

Wrapped categorical axes wrap and measure each label once, then reuse the
cached lines/widths for overlap, side reserve, and tick emission.
