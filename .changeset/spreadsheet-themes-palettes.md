---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(theme): calc + excel + excel_new chart themes and palettes (ggthemes spreadsheet family)

Clean-room port of the ggthemes spreadsheet family: `theme_calc()` +
`calc_pal()`, `theme_excel()` + `excel_pal()`, `theme_excel_new()` +
`excel_new_pal()`.

- Theme `calc`: LibreOffice Calc defaults — white panel, gray70 (`#b3b3b3`)
  border and y-major grid, no axis lines, black text, 13px title.
- Theme `excel`: the Excel 97 classic look — `#c0c0c0` gray panel, black
  y-major grid and panel border (theme_bw chrome per this port's lineage).
- Theme `excel_new`: current Excel defaults — `#595959` text, hairline
  `#bfbfbf` y-grid, no ticks, no border, plain 14px title. R's blank axis
  titles flatten into the shared roles (documented on the token block).
- Palettes for ordinal color/fill scales: `calc` (12 chart colors), `excel`
  (Excel 97 line/point set, `scale_colour_excel`), `excel_fill` (Excel 97
  area set, `scale_fill_excel`), `excel_new` (the default "Office Theme"
  accents — ggthemes ships 50 named Office themes; only the default is
  registered, documented subset).
- Svelte shells `ThemeCalc`, `ThemeExcel`, `ThemeExcelnew`; docs `/themes`
  gains the three portraits (each paired with its own scheme) and
  `/palettes` gains the four cards.

Migration: none — additive
