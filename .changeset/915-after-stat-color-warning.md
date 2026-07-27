---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: warn when an after_stat color/fill mapping is ignored (#915)

An `{ stat }` mapping on `color`/`fill` was accepted for every geom but only
`density_2d` / `density_2d_filled` ever resolve one into colour values, so
elsewhere it was dropped without a diagnostic. Those cases now emit a
`stat-channel-unsupported` warning naming the stat and the requested column.

This is a warning rather than an error: the layer still renders exactly as
before, and after-stat colour is a mapping we intend to support more widely
(tracked separately).

Migration: none — diagnostic only
