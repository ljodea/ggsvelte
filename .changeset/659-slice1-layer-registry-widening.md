---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat: widen LayerRegistry for non-mark plot layers

Add a `Layer` union (mark + scale/theme/coord/facet/labs/guides/legend),
`markLayers` / `registerPlotLayer`, and fold non-mark `plotLayers` into
assembly after the existing gates. No public behaviour change: no non-mark
components ship yet, and mark consumers read `markLayers`.

Migration: none — additive
