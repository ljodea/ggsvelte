---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: cap and clip rotated left/right facet strip labels to panel height

Long side-strip labels no longer paint into neighboring multi-row panels.
Labels truncate with ellipsis to the panel-height advance budget; SVG/Svelte
strip chrome clips to the strip band as defense in depth. Strip band width
is remeasured against that vertical budget.
