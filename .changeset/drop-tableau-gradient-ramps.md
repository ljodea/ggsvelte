---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/skill": minor
---

<!-- markdownlint-disable MD041 -->

# Drop Tableau gradient ramps (`tableau_seq_*` / `tableau_div_*`)

Remove all 30 ggthemes `tableau_gradient_pal` ordered-sequential and
ordered-diverging ramps from the named scheme registry, scale engine, docs
ramps index, and agent skill inventory.

Migration: if you set `scheme: "tableau_seq_*"` or `scheme: "tableau_div_*"`,
switch to another sequential ramp (`viridis`, ColorBrewer, Crameri
`batlow`/`vik`, …) or pass an explicit `range`. Categorical Tableau schemes
(`tableau10`, `tableau20`, `tableau_colorblind`, …) are unchanged.
