---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: trim canvas-scatter showcase so VR smoke stays under budget (#926)

Reduce the gallery specimen from 10k to 2.5k marks (still above
`CANVAS_AUTO_THRESHOLD`) so Playwright VR/gallery capture finish without a
180s timeout mask. Wall time under headless Chromium scaled roughly with mark
count (~156s at 10k → ~42s at 2.5k).

Migration: none — docs/example display density only; no public API change.
