---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(theme): base + igray + map + solid chart themes (ggthemes minimalist family)

Clean-room port of ggthemes `theme_base()`, `theme_igray()`, `theme_map()`,
and `theme_solid()`. (This family ships no palettes in ggthemes.)

- Theme `base`: base-R graphics defaults — white panel with a black frame
  (panel.border; axis.line is blank in the theme_grey lineage), black ticks,
  no grid, black text, bold rel(1.2) title on base 16.
- Theme `igray`: the theme_gray inverse — white panel over a gray90
  (`#e5e5e5`) surround with a matching gray90 major grid.
- Theme `map`: every axis/panel/grid element blank — marks only, for maps.
  Converges with `void` in this token model (both keep the title).
- Theme `solid`: removes every non-geom element. This model has no
  suppress-title role, so R's blanked title flattens into the shared
  void-like surface (documented on the token block).
- Svelte shells `ThemeBase`, `ThemeIgray`, `ThemeMap`, `ThemeSolid`; docs
  `/themes` gains the four portraits.

Migration: none — additive theme names only.
