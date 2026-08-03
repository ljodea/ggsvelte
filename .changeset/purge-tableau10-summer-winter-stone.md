---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": minor
"@ggsvelte/cli": minor
---

# Drop Tableau 10, Summer, Winter, and stone schemes

Migration: <https://ggsvelte.sh/guide/upgrading#removed-tableau-10-summer-winter-and-stone-schemes>

Remove six categorical schemes (and public `*_PALETTE` constants):
`tableau10`, `tableau_summer`, `tableau_winter`, `tableau_miller_stone`,
`tableau_superfishel_stone`, `tableau_nuriel_stone`.

Prefer `observable10`, `colorblind`, `Dark2`, `pander`, or another remaining
Tableau scheme (`tableau20`, `tableau_colorblind`, `tableau_jewel_bright`, …),
or pass an explicit `range`.

Skill inventory (`SKILL.md`, `references/scales-and-palettes.md`) drops the
same schemes so agents no longer list them.
