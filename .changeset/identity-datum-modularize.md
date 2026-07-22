---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor: modularize identity candidate datum resolver

Split locate, series, and shared types out of datum.ts; keep a thin factory
plus lineage/attribute assembly. Public re-exports preserve test import paths.
