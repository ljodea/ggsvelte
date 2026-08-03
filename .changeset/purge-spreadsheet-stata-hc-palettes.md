---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
---

# Drop Stata extras, Highcharts, Excel, and Calc schemes

Migration: <https://ggsvelte.sh/guide/upgrading#removed-spreadsheet-and-extra-stata-categorical-schemes>

Remove nine categorical schemes that pad the palette catalog without adding
distinctive value: `stata_s1color`, `stata_s1rcolor`, `stata_mono`, `hc`,
`hc_dark`, `calc`, `excel`, `excel_fill`, `excel_new`.

Switch `scheme` (and any import of the removed `*_PALETTE` constants) to a
remaining scheme such as `stata`, `tableau10`, `grey`, `gdocs`, or `pander`.
Chart themes that shared those names remain.
