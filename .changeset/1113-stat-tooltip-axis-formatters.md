---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(tooltip): format stat-layer position values with axis formatters

Default tooltip field rows for stat layers (no source row) now route x/y
through the same scale-aware axis formatters as the axis header. Temporal
stats no longer dump raw epoch milliseconds (#1113). Live-region text
matches. Non-position channels and identity rows keep the plain cell path
when formatters are absent.

Migration: none — display-only for default tooltips and keyboard live text
