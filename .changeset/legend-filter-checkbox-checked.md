---
"@ggsvelte/svelte": patch
---

fix legend-filter checkbox visuals: drive `input.checked` from controller state instead of Svelte's `checked={}` binding so trusted label clicks uncheck when a series is hidden. Trim the legend-filter gallery subtitle.
