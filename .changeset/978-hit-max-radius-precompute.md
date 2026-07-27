---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): precompute per-point-batch maxRadius for hitTest

Variable aes(size) used to re-scan `batch.sizes` on every pointer probe.
Build stores max(batch.size, …sizes)×1.25 on the spatial point-batch entry
so resolveTopmostHit only expands the query pad from that value.
