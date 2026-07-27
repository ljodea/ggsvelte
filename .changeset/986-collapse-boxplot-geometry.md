---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor(core): collapse boxplot geometry family; delete dead smooth-line write

Merge the 12-file boxplot geometry tree into geometry-boxplot.ts +
geometry-boxplot-body.ts. Delete orphaned geometry-smooth-line-write.ts
(no src/ importers; only a test kept it alive).
