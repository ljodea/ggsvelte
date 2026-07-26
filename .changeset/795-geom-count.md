---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#795): geom_count + stat_sum overplotting counts

Add `stat: "sum"` (after_stat `n` and `prop` within group) and `geom: "count"`
sugar (point marks; size defaults to `{ stat: "n" }`). Also
`.geomPoint({ stat: "sum" })` / `<GeomCount />`.
