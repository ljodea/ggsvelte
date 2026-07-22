---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat: portable within-mark gradients and bounded glow (#591)

Add a closed JSON-serializable paint vocabulary on compatible geom params
(`fillPaint`, `strokePaint`, `glow`) with deterministic linear/radial gradients,
ordered hex color stops, required solid fallbacks, and bounded glow radii.

Migration: none — additive. Themes and solid `color`/`fill` specs are unchanged.
Paint is opt-in mark appearance, not theme decoration or a data scale.
