---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
"@ggsvelte/skill": patch
"@ggsvelte/cli": patch
---

# Elevate tooltip cards on dark, hcdark, 538, economist

Raise default tooltip surfaces so tips read as floating cards on `dark`,
`hcdark`, `fivethirtyeight`, and `economist`. Edition-2 dark elevates fill only;
LEGACY dark elevates `tooltipPaper` only (border stays rgba grid-derived).
hcdark also brightens tip ink. VR smoke golden `interaction-tooltip-dark.png`
updates with the dark tip change.
