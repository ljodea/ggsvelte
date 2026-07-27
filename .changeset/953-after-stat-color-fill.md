---
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat(core): resolve after_stat color/fill outside density_2d (#953)

Migration: none — additive

`aes(fill = after_stat(count))` on histograms and the same pattern for
`density` / `ncount` / `ndensity`, plus count and density stats, now map
into continuous fill/color scales and legends. Shared `colorColumns`
helper; `STAT_COLOR_COLUMNS` extended so #915 no longer warns for these.
