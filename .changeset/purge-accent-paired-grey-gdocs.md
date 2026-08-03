---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": minor
"@ggsvelte/cli": minor
---

# Drop Accent, Paired, Grey, Google Docs, and Tableau multi-hue schemes

Migration: <https://ggsvelte.sh/guide/upgrading#removed-accent-paired-grey-google-docs-and-tableau-multi-hue-schemes>

Remove eight categorical schemes (and public `*_PALETTE` constants where they
existed): `Accent`, `Paired`, `grey`, `gray`, `gdocs`,
`tableau_green_orange_teal`, `tableau_red_blue_brown`,
`tableau_purple_pink_gray`.

Also remove chart theme `gdocs` and its Svelte shell `ThemeGdocs`.

`scaleColorGrey()` / `<ScaleColorGrey />` still work by baking an explicit
greyscale `range` (optional `start`/`end`). They no longer emit
`scheme: "grey"`. Prefer `Dark2`, `tableau10`, `colorblind`, or `pander` for
named categorical color; prefer `minimal`, `classic`, or `bw` for themes.

Skill inventory (`SKILL.md`, `references/scales-and-palettes.md`,
`references/themes.md`) drops the same schemes and theme so agents no longer
list them.
