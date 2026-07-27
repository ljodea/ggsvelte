---
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

Generate Geom* shells from the spec schema (`GEOM_PARAM_KEYS`) so param lists are no longer hand-copied. Schema param keys such as `fillPaint`, `strokePaint`, and `glow` now forward into layer params when set on the corresponding shells.
