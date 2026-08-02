---
"@ggsvelte/core": minor
---

# Interaction: columnar candidate datum + lazy axis groups

Migration: none — additive. `CandidateStoreOptions.datum` keeps working; the
new `datumColumns` seam and `LineageStore.internSingleton` are optional.

Faster first-hover on dense charts: candidate stores now resolve
source-backed datum values as per-batch columns (no per-candidate object
churn) and build axis-group tables lazily on the first `group()` call. At
100k points the first interaction query is ~60% faster (canvas cold scatter
workload: 651 → 263 ms on an x86_64 dev host).
