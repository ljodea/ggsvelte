---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: stat_manual portable named per-group transforms (#814)

Add `stat: "manual"` on point, line, and path with required `params.fun`
from a portable named registry (`first` | `last` | `mean` | `median` |
`min` | `max` | `sum`). first/last keep one source row per aesthetic group;
aggregate funs collapse each group to one synthetic row (x and y aggregated
independently). No JS callbacks (PortableSpec only).

Missing `fun` fails loud (`manual-fun-required`); unknown `fun` is schema
`invalid-enum-value`.

Migration: none — additive
