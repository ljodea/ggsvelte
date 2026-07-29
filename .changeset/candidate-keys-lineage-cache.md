---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

perf(svelte): cache candidate semantic keys by lineage membership

Interval, selection, and mask projection walk every candidate. Marks that
share a lineage (smooth eval grids) now expand membership once and reuse
the key bag. Single-candidate paths stay O(L) on first hit.

Migration: none — internal speedup only
