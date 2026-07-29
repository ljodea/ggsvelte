---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(theme): wsj chart theme and five wsj palettes (ggthemes theme_wsj / scale_*_wsj)

Clean-room port of ggthemes `theme_wsj()` and `wsj_pal()` with
`scale_colour_wsj()` / `scale_fill_wsj()`.

- Theme `wsj`: Wall Street Journal chrome — "brown" paper `#f8f2e4`, dotted
  black y-grid only, x axis line and ticks, no y line/ticks, big bold title
  (rel(2) of base 12). R's `title_family = "mono"`, bold axis text, and blank
  axis titles flatten into the shared font/weight roles (documented on the
  token block); the colors6 red `#c72e29` accent pairs unmapped marks with
  the wsj palette.
- Palettes for ordinal color/fill scales, one scheme per `wsj_pal()`
  variant: `wsj` (colors6, the ggthemes default), `wsj_rgby`,
  `wsj_red_green`, `wsj_black_green`, `wsj_dem_rep`.
- Svelte shell `ThemeWsj`; docs `/themes` gains the WSJ portrait (paired
  with the wsj scheme) and `/palettes` gains the five WSJ cards.

Migration: none — additive
