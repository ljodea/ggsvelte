---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: deriveGroups groupCount from id map, not Math.max spread

canonicalGroups returns `{ groups, groupCount: ids.size }` so large row
counts no longer risk call-stack / arg limits from `Math.max(...groups)`.
