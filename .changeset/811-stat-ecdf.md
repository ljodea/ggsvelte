---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#811): stat_ecdf empirical CDF + line curve step-hv

Add `stat: "ecdf"` on line layers (y defaults to `{ stat: "ecdf" }`) with
`params.pad` / `params.n`. Prefer `curve: "step-hv"` for right-continuous
stairs (mid `step` is wrong for ECDFs). Finite-clamp pad (prepend xmin,0;
ggplot2 uses ±Inf). Shared path-step helper for step-hv / step-vh / mid.

Migration: none — additive
