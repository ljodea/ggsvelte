---
"@ggsvelte/svelte": patch
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): guard bar/col xy inspect and box GeomText chrome

Explicit inspect.mode x/xy on GeomBar/GeomCol now emits four interaction
advisories (plain guide-through-bar, then stronger bisect-value-label
warnings). GeomText hover/pin chrome is a measured rectangular box instead
of a point ring. Auto mode was already exact for bar/col.

Migration: none — additive diagnostics and presentation defaults
