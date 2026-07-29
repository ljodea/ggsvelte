---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(theme): gdocs + hc + hcdark + pander chart themes and palettes (ggthemes web/tech family)

Clean-room port of the ggthemes web/tech family: `theme_gdocs()` +
`gdocs_pal()`, `theme_hc()` default/darkunica + `hc_pal()`, and
`theme_pander()` + `palette_pander()`.

- Theme `gdocs`: Google Docs defaults — white panel, `#cccccc` major grid,
  black x-only axis line, no ticks, `#757575` text, plain 20px title.
- Themes `hc` / `hcdark`: Highcharts default and darkunica — y-only major
  grid (`#D8D8D8` / `#707073`), no border. `hcdark` documents one deviation:
  R leaves axis text at theme_grey's dark grey (dark-on-dark); this port
  uses the style's `#A0A0A3` text colour for axis text and ticks.
- Theme `pander`: pander defaults — dashed `#bebebe` grid (R "grey"),
  grey ticks, bold 14.4px title, no visible border.
- Palettes for ordinal color/fill scales: `gdocs` (6 hues × 4 strengths,
  copied verbatim including the upstream teal-2 duplicate), `hc` (10),
  `hc_dark` (11, verbatim with trailing repeats), `pander` (Okabe-Ito hues
  in pander's order, `#999999` for black).
- Svelte shells `ThemeGdocs`, `ThemeHc`, `ThemeHcdark`, `ThemePander`; docs
  `/themes` gains the four portraits (each paired with its own scheme) and
  `/palettes` gains the four cards.

Migration: none — additive theme/scheme names only.
