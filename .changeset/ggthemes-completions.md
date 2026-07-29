---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(theme): economist_white + solarized_2 themes, few + fivethirtyeight palettes (ggthemes completions)

Clean-room ports completing four already-shipped ggthemes families.

- Theme `economist_white`: ggthemes `theme_economist_white(gray_bg = TRUE)` —
  the Graphic Detail blog variant of `theme_economist`: white panel on
  light-gray (`#ebebeb`) paper, dark-gray (`#c9c9c9`) major grid, economist
  chrome otherwise unchanged.
- Themes `solarized_2` / `solarized_2dark`: ggthemes `theme_solarized_2()`
  light/dark — the theme_grey-flavored Solarized variant (base2 panel, base3
  grid, no frame; R's misspelled `reabase01` axis-line key resolves to NA,
  so no axis line — documented on the token block).
- Palettes for ordinal color/fill scales: `few` (Few "Medium", the
  `scale_colour_few` default), `few_light` (the `scale_fill_few` default),
  `few_dark`, and `fivethirtyeight` (blue/red/green). ggthemes reserves
  Few's first value (Gray) for non-data parts at n = 1; the fixed lists are
  the eight data colors in source order, matching ggthemes' prefix picks.
- Svelte shells `ThemeEconomistwhite`, `ThemeSolarized2`,
  `ThemeSolarized2dark`; docs `/themes` gains the three portraits (the Few
  and FiveThirtyEight themes now demo with their own palettes) and
  `/palettes` gains the four cards.

Migration: none — additive
