---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(geom): geom_qq + geom_qq_line normal Q–Q plots (#804)

ggplot2-compatible Q–Q scatter and reference line: `aes.sample`, `stat_qq` /
`stat_qq_line` (normal theory quantiles + quartile line), builder
`.geomQq()` / `.geomQqLine()`, and `<GeomQq />` / `<GeomQqLine />`.

Migration: none — additive
