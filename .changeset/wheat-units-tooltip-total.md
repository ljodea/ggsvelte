---
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": patch
---

# Gate axis-inspect Total to stack/fill; clarify Playfair wheat chart

Migration: none — additive (`RenderModel.layerPositions`). Parallel multi-series
(identity/dodge) no longer show a default tooltip **Total** row —
`groupTotal` is `null` when the axis group has no stack/fill layer; hosts that
read `groupTotal` for comparison series must treat `null` as “no composition
total.” Stacked and filled compositions still sum unique series contributions.

Why: summing non-additive series (e.g. wheat price + weekly wage) invented a
meaningless total. The gallery multi-series Playfair example now names units
(quarter ≈ 8 bushels vs week) and a companion labor-cost ratio chart plots
weeks of work per quarter.
