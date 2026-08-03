---
"@ggsvelte/core": minor
---

# Faster continuous color and mapped style vectors at 100k (#1423)

Migration: none — additive. New public helpers `buildRampLut`, `sampleRampLut`,
and `RAMP_LUT_STEPS` are optional; `trainSequential` / `colorOf` behavior is
the default path apps already use.

- Sequential color scales train a dense ramp LUT (`RAMP_LUT_STEPS = 1024`);
  per-point `colorOf` is one clamp + index lookup after `t` is known.
- Fixture mid/endpoints that land on table entries stay bit-identical to
  continuous `rampColor` (e.g. `t = 0`, `0.5`, `1` and log10 decades on
  black↔white). Other `t` values quantize to the nearest of 1025 samples —
  at most one sRGB channel step vs continuous piecewise-linear output
  (#1423 acceptance: LUT or documented tolerance).
- `mappedPaintVector` / numeric / indexed style vectors resolve the scale once
  per unique source value, then fan out (bench columns cycle ~100–1000 levels).

Local medians on 100k canvas points (before → after): color-log10 **~101 → ~38 ms**,
mapped-style **~89 → ~66 ms**. Budgets in `benchmarks/budgets.json` tightened to match.
