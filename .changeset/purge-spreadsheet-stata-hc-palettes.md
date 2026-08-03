---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": minor
"@ggsvelte/cli": minor
---

# Drop spreadsheet/Stata-extra schemes and Excel/Calc/Stata Mono themes

Migration: <https://ggsvelte.sh/guide/upgrading#removed-spreadsheet-highcharts-and-extra-stata-schemes-and-themes>

Remove nine categorical schemes and their public `*_PALETTE` constants:
`stata_s1color`, `stata_s1rcolor`, `stata_mono`, `hc`, `hc_dark`, `calc`,
`excel`, `excel_fill`, `excel_new`.

Also remove four chart themes (and their Svelte shells): `stata_mono`
(`ThemeStatamono`), `calc` (`ThemeCalc`), `excel` (`ThemeExcel`), `excel_new`
(`ThemeExcelnew`). Nothing with "Excel" remains in the product surface.

Skill inventory drops the same schemes and themes.

Switch removed schemes to `stata`, `tableau10`, `Dark2`, or `pander`.
Switch removed themes to `stata`, `stata_s1color`, `bw`, `classic`, or
`minimal`.
