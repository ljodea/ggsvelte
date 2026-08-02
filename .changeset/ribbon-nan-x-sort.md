---
"@ggsvelte/core": patch
---

# Sort ribbon/area groups when x keys include missing values

Migration: none. Ribbon/area groups with non-finite running coordinates no
longer skip x-sorting, and finite rows sort in place so missing slots still
split shaded bands into separate runs (ggplot2 NA gaps).
