---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(theme): stata chart themes and palettes (ggthemes Stata schemes)

Clean-room port of ggthemes `theme_stata()` + `stata_pal()` with
`scale_colour_stata()` / `scale_fill_stata()`.

- Theme `stata` (s2color): the default Stata look — ltbluishgray (`#eaf2f3`)
  plot region around a white panel, matching y-major grid, black axis lines
  and ticks, no panel border. Sizes from the stata_gsize ratios (base 11,
  axis 10, title 14, axis title 10). R's dknavy title colour folds into the
  single ink role; the bottom legend position is not expressible
  (documented on the token block).
- Theme `stata_s1color`: the older s1 look — white plot/panel, gs14 y-grid,
  black panel border.
- Theme `stata_mono` (s2mono): gs15 plot region, dimgray y-grid, no border.
- Palettes for ordinal color/fill scales, one scheme per `stata_pal()`
  variant: `stata` (s2color, the ggthemes default), `stata_s1color`,
  `stata_s1rcolor`, `stata_mono` — 15 colors each, resolved from Stata's
  named color table in source order.
- Svelte shells `ThemeStata`, `ThemeStatas1color`, `ThemeStatamono`; docs
  `/themes` gains the three portraits (each paired with its own scheme) and
  `/palettes` gains the four cards.

Migration: none — additive
