---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
"@ggsvelte/skill": patch
"@ggsvelte/cli": patch
---

# Tooltip overrides in themed() and sticky-when-elevated resolveTheme tips

`themed()` accepts optional `tooltipPaper` / `tooltipInk` / `tooltipBorder` so
complete themes can elevate the tip package above pure foundation derivation.

`resolveTheme` object path uses sticky-when-elevated tip inheritance: named bases
that store non-derived tip roles keep them when authors only tweak
typography/accent/etc.; pure themes still re-derive tip from paper/panel/grid.
Explicit ThemeSpec tip roles still win.

No built-in problem-theme hex changes in this release slice — those follow in
separate token PRs.
