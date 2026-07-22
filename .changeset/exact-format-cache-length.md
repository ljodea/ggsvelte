---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

perf: skip exact-format compile cache for empty/oversize format strings

`compileExactFormat` rejects length 0 and length >128 before any Map get/set so
adversarial long rejected formats cannot accumulate as unbounded cache keys.
