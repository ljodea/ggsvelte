---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(scale): fourteen tableau categorical palette variants (ggthemes tableau_color_pal regular set)

Clean-room port of every remaining `tableau_color_pal(type = "regular")`
variant, completing the regular Tableau set alongside the existing
`tableau10`. Values are verbatim copies of the upstream YAML tables in
source order (ggthemes' n picks are prefix walks, so the fixed lists match
exactly).

- `tableau20` — the classic paired Tableau 20.
- `tableau_colorblind` — Tableau's colorblind-safe 10.
- `tableau_seattle_grays` (5), `tableau_traffic` (9),
  `tableau_miller_stone` (11), `tableau_superfishel_stone` (10),
  `tableau_nuriel_stone` (9), `tableau_jewel_bright` (9),
  `tableau_summer` (8), `tableau_winter` (10),
  `tableau_green_orange_teal` (12), `tableau_red_blue_brown` (12),
  `tableau_purple_pink_gray` (12), `tableau_hue_circle` (19).
- Docs `/palettes` gains the fourteen cards (29 total).

The ordered-sequential and ordered-diverging Tableau ramps are a separate
follow-up (they feed the sequential scheme registry, not the categorical
one).

Migration: none — additive
