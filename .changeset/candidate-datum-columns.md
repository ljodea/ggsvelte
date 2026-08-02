---
"@ggsvelte/core": minor
---

Faster first-hover on dense charts: candidate stores now resolve source-backed datum values as per-batch columns (no per-candidate object churn) and build axis-group tables lazily on the first `group()` call. At 100k points the first interaction query is ~60% faster. Adds `CandidateStoreOptions.datumColumns` and `LineageStore.internSingleton` to the public API; no behavior change.
