---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#829): scale_*_hue / grey / gray / ordinal constructors

ggplot2-style discrete colour helpers for HCL hue and greyscale palettes, plus
`scale_*_ordinal` as a discrete alias. Fixed 10-stop tables keep grow-mode
assignments value-stable; `gray` normalises to `grey`.
