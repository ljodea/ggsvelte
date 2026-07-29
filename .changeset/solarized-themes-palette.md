---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(theme): solarized + solarizeddark chart themes and solarized palette

Clean-room port of ggthemes `theme_solarized()` (light and `light = FALSE`)
and `scale_colour_solarized()` / `scale_fill_solarized()`.

- Themes `solarized` and `solarizeddark`: theme_bw geometry on Schoonover's
  rebased tones — base3/base03 panels, base2/base02 grids, base1/base01
  chrome and text, transparent plot background, framed panel, blue `#268bd2`
  accent. As with the other ports, R's darker title step (rebase0) flattens
  into the single ink role.
- Palette `solarized` for ordinal color/fill scales: the eight Solarized
  accents with ggthemes' default blue first, then source order — ggthemes'
  max-L*a*b-distance selection is order-degenerate at n = 8. The same accent
  ramp serves both themes; only the base tones flip (Schoonover's design),
  so no separate dark scheme is registered.
- Svelte shells `ThemeSolarized` / `ThemeSolarizeddark`; docs `/themes` gains
  both portraits (paired with the solarized scheme) and `/palettes` gains
  the Solarized card.

Migration: none — additive theme/scheme names only.
