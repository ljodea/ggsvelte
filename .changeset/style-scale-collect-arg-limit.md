---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

# Collect style scale values without spreading row columns

Migration: none — internal

Mapped style aesthetics collected frame values with `values.push(...mapped)`.
Past the engine argument limit that threw `RangeError` on large data. Values
are now pushed one element at a time, matching the colour collect path.
