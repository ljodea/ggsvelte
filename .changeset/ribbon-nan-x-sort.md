---
"@ggsvelte/core": patch
---

# Sort ribbon/area groups when x keys include missing values

Migration: none. Ribbon/area groups with non-finite running coordinates no
longer skip x-sorting (NaN made the ordered-check always succeed), so shaded
bands with gaps keep left-to-right vertex order after the finite filter.
