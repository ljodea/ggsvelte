---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: deriveGroups groupCount from Map size (no Math.max spread)

Explicit and derived grouping return groupCount as the canonical Map size
after the O(R) pass, avoiding a second full-array Math.max(...groups) that
can RangeError on large row counts.
