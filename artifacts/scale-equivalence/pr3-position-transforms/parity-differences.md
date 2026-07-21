# Explained parity differences

## Equivalent semantic staging

Both ggplot2 4.0.3 (`scale_x_log10`) and ggsvelte transform position values before `stat_smooth`, `stat_bin`, and `stat_density`. The checked reference output is in `ggplot2-reference.json`; ggsvelte's canonical spec and stage trace are adjacent.

- `stat_bin` width `0.5` and boundary `0` are transformed-space values. Boundary zero corresponds to semantic x = 1.
- Smooth and density consume transformed x once.
- Public ggsvelte domains, guide values, candidates, and interactions inverse-project to semantic source units.

## Intentional differences

1. **Rendering and defaults.** The evidence chart overlays three statistically different y measures only to exercise staging. Theme, stroke, and layer paint defaults are not expected to be pixel-identical.
2. **Determinism.** ggsvelte uses deterministic seeded jitter and bounded pure-TypeScript statistics. This fixture does not use jitter, but the policy differs from ggplot2's fresh random draws.
3. **Guide planning.** ggsvelte emits an immutable measured `AxisGuidePlan`; ggplot2's guide object is not the interchange contract. Tick values remain semantically equivalent.
4. **Binned scale limit.** ggsvelte caps portable binned scales at 64 bins and uses right-closed, inclusive-lowest assignment. The cap is a portability/performance guard.
5. **Expansion.** ggsvelte now applies 5% multiplicative expansion to non-temporal continuous and binned axes. Small tick/extent differences can remain because numeric nice-break algorithms differ.

No internal integer bin id, transformed column, or full source column is exposed through RenderModel diagnostics or interaction payloads.
