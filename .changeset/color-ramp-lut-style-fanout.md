---
"@ggsvelte/core": patch
---

# Faster continuous color and mapped style vectors at 100k (#1423)

Migration: none. Internal emit path; existing color fixtures stay bit-identical
at trained mid/endpoints (1024-step LUT samples the same `rampColor` rounding).

- Sequential color scales train a dense ramp LUT (`RAMP_LUT_STEPS = 1024`);
  per-point `colorOf` is one clamp + index lookup after `t` is known.
- `mappedPaintVector` / numeric / indexed style vectors resolve the scale once
  per unique source value, then fan out (bench columns cycle ~100–1000 levels).

Local medians on 100k canvas points (before → after): color-log10 **~101 → ~38 ms**,
mapped-style **~89 → ~66 ms**. Budgets in `benchmarks/budgets.json` tightened to match.
