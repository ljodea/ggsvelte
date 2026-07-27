---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat: stat_ellipse bivariate normal confidence rings (#812)

Add `stat: "ellipse"` on path layers (ggplot2 stat_ellipse, type "norm" only).
Per-group mean + sample covariance → χ²-scaled ellipse perimeter; segments
samples + closing duplicate for a closed path ring. Params: level (0.95),
type ("norm"), segments (51 before close).

Intentional subset: path-only; type norm only (not t/euclid).

Migration: none — additive
