---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: O(P·B)→O(P+B) SVG panel batch routing via shared groupBatchesByPanel

Faceted pure-SVG renders no longer re-scan every geometry batch for each panel.
`groupBatchesByPanel` (issue #185) is pure and shared with the canvas stratum path.
