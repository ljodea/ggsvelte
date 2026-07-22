---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: unique-first resolution() O(R+U log U); continuous bars reuse helper

`resolution` dedupes finite values before sorting so multiset columns only pay
sort cost over distinct gaps. Continuous bar width uses the same helper.
