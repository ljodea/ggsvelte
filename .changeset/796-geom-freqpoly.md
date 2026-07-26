---
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_freqpoly frequency polygon (#796)

Add ggplot2-style `freqpoly` alias that normalize() rewrites to `line` +
`stat: "bin"` + position identity. Bin centers are drawn as a path; y defaults
to count (or density). LineParams gains optional STAT BIN ONLY knobs;
PathParams stays style-only so path never accepts bin params.

Surfaces: PortableSpec, `.geomFreqpoly()`, `<GeomFreqpoly>`.

Migration: none — additive
