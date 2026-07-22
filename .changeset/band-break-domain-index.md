---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(K·D)→O(K+D) band break domainIndex via encodeKey map

Explicit band scale breaks resolve domain indices with a first-occurrence
`encodeKey` map (trainBand identity), including signed zero and typed 1/"1".
Band break lists are also deduped in O(K) in layoutDomain.
