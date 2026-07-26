---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_dotplot + stat_bindot histodot stacked dots (#803)

Add `geom: "dotplot"` (default `stat: "bindot"`) for histodot stacked points:
fixed bins via shared bin-breaks, one point per observation, stackdir
up|down|center|centerwhole, stackratio, and diameter from binwidth × x-scale
(dotsize; size px override). y is after_stat `stackpos` only. Builder
`.geomDotplot()` and Svelte `<GeomDotplot />`.

v1: histodot only — no Wilkinson dotdensity, no binaxis=y, no weights.

Migration: none — additive
