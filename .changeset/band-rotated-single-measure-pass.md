---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: one measureWidth per rotated band tick for height and overhang

Rotated categorical axes measure each labeled tick once and reuse the width
for both label-band height and end-anchored overhang.
