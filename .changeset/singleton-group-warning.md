---
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat(core): warn when every connected-mark group has one observation

Band/discrete x joins the default grouping interaction (ggplot2 parity), so
an area or line with a discrete series aesthetic can derive one group per
(category, series) cell and silently degenerate every ribbon or stroke. Line
and area batches now emit `group-single-observation` — ggplot2's geom_path
warning, extended to area — naming the aes.group remedy.

Migration: none — additive (new warning name; no existing surface changed).
