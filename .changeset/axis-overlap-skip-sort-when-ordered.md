---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(K) band thinning overlap after one pos-sort

Rotated band label thinning sorts projections once per angle then reuses the
sorted list (filter by every-k). neighbourOverlap accepts alreadySorted for
temporal re-checks.
