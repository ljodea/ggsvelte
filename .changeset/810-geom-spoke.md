---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_spoke origin + angle + radius segments (#810)

Add ggplot2-style `spoke` geom: endpoints derived as
`xend = x + radius·cos(angle)`, `yend = y + radius·sin(angle)` in data space
(then the same position transform as x/y). Angle is radians. Reuses segment
rendering. CHANNELS gain `angle` and `radius`; constants via `params.angle` /
`params.radius` when not mapped. Continuous x/y required.

Migration: none — additive.
