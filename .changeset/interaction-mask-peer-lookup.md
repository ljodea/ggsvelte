---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): resolve outline mask sources with one per-layer index instead of rescanning every batch per outline in `buildInteractionMasks` (O(B²) → O(B) over geometry batches; this path recomputes on every hover/legend emphasis change)
