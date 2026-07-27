---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: leave modest integer tick labels ungrouped (#779)

`defaultTickFormat` only applies thousands grouping when the tick step is
at least 1000, so year-like domains (e.g. 800–2030) render `1000` instead of
`1,000`. Huge-number axes keep commas. Authors can still force grouping with
`labels: ",d"`.

Migration: charts whose continuous tick step is under 1000 may lose commas
on four-digit labels; use `labels: ",d"` (or `",.Nf"`) to restore grouping.
