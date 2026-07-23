---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: wrap-then−45° hybrid band labels when plain wrap fails (#637)

Auto categorical labels that cannot wrap now balance multi-word text onto
≤2 shorter lines and rotate at −45° before full-string −45°/−90° + truncate.
Svelte and SVG renderers draw multi-line end-anchored rotated ticks.

Migration: none — auto layout quality only; author guide pins unchanged
