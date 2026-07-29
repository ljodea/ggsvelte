---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(svelte): expand each lineage id once for key and interval resolve

Smooth and other aggregate eval-grid marks share one lineage membership
across many candidates. resolveSemanticKeys and
lineageRowIndexesFromCandidates now walk each lineage id once instead of
re-spreading O(C·L) times. Diagnostics for empty lineages still fire per
candidate.

Migration: none — internal speedup only
