---
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: convenience geoms jitter, hline, vline (#818)

Add ggplot2-style geom aliases that normalize to existing marks:

- `jitter` → `point` + `position: "jitter"` (`geomJitter` / `<GeomJitter>`; flat width/height/seed assemble into `positionParams` at the builder/component boundary)
- `hline` / `vline` → `rule` (`geomHline` / `geomVline` / components); annotation intercepts suppress plot-aes inheritance; data-driven forms drop the orthogonal axis

No new mark types. Migration: none — additive.
