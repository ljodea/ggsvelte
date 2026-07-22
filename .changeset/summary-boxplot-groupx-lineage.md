---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(1) summary/boxplot group×x lineage resolve via finite-y prefilter

Build-time group×x buckets for summary/boxplot now store only finite-y source
rows (with empty buckets when every y is non-finite), so candidate resolve
returns the shared frozen array without per-mark y re-filtering or full-group
clones. Count buckets are unchanged.
