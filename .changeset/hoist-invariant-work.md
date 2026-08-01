---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): run the ISO shape regex once per string cell in `isIsoLikeString` (was twice), and hoist the kind-rank table out of `compareTokens` so the store-build sort comparator allocates nothing per call
