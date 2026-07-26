---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_quantile + stat_quantile linear RQ lines (#805)

Add `geom: "quantile"` (default `stat: "quantile"`) with linear y~x
quantile regression at `params.quantiles` (default 0.25/0.5/0.75).
Builder `.geomQuantile()` and Svelte `<GeomQuantile />`.

v1: linear rq only (no rqss / formula / weights). Pinball-minimizing
order-statistic intercept; pairwise-slope exact search for small n.
Migration: none — additive
