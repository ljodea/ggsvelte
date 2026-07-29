---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(svelte): expand legend lineages once per lineage id

buildLegendEntryKeyIndex shared membership Sets across candidates with the
same lineage id (smooth eval grids). Lineage is no longer re-walked once
per mark. Candidate-local rowIndex still attaches without mutating the
shared bag.

Migration: none — internal speedup only
