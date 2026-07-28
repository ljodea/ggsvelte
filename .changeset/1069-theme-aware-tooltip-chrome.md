---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(theme): flat tooltip chrome for gridless themes

Gridless themes (tufte, void) derive a transparent tooltip keyline and omit the
default "Click to pin" affordance so minimal-ink charts keep flat interaction
chrome (#1069). Pinning still works; only the instructional footer is silent.
Themes that draw a grid keep the hairline border and pin hint. Inspect configs
with `pin: false` also omit the affordance.

Migration: none — additive visual for gridless themes only
