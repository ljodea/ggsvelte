---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: project a wide band selection without spreading the keys

`SemanticViewportPanel.project()` derived a band selection's extent with
`Math.min(...centers)` / `Math.max(...centers)`, one argument per selected key.
`keys` is a plain `readonly string[]` on the exported selection type, so a wide
enough band brush threw `RangeError: Maximum call stack size exceeded` instead
of returning an extent. The ceiling is the engine's argument limit — around
100 000 keys in V8, so a browser hits it well before Bun does.

It now walks the keys once, tracking the smallest and largest center, so no
selection size can overflow the call. Same extent as before for every selection
that already worked, and unknown keys are still skipped.
