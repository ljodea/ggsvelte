---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(scale): thirty tableau gradient ramps (ggthemes tableau_gradient_pal set)

Clean-room port of every `tableau_color_pal` ordered-sequential (15) and
ordered-diverging (15) ramp — the `scale_*_gradient_tableau` /
`scale_*_gradient2_tableau` family — completing the Tableau palette set.

- 15 `tableau_seq_*` ramps: blue-green, blue-light, orange-light (7 stops
  each) and the single-hue blue, orange, green, red, purple, brown, gray,
  gray-warm, blue-teal, orange-gold, green-gold, red-gold ramps (20–21
  stops each).
- 15 `tableau_div_*` ramps: orange-blue, red-green, green-blue, red-blue,
  red-black, gold-purple, red-green-gold, sunset-sunrise, the four
  *-white variants, orange-blue-light, and temperature (7 stops each).
- Values are verbatim copies of the upstream YAML tables in source order.
  Stop counts exceed `MAX_PAINT_STOPS` safely: ramps are interpolation
  tables for continuous/binned scales and are re-sampled by the colorbar,
  never emitted as raw paint stops (documented in the module header).
- Resolution follows the ColorBrewer pattern: a new
  `packages/core/src/scales/tableau-ramps.ts` family module consulted as
  the fallthrough in `resolveSequentialPipelineRange` and
  `resolveOrdinalPaletteStops` (Tableau ramps also work ordinally, like the
  brewer sequential tables).

Migration: none — additive scheme names only.
