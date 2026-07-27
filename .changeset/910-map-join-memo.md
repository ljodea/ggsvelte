---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): memoize geom_map join index across facet panels

Fortified map table + byKey index are built once per LayerBinding (WeakMap)
instead of once per panel. `map-region-missing` is also emitted at most once
per layer per run.
