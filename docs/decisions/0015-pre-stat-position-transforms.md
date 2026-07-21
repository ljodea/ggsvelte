# Decision 0015: position scales transform before statistics

**Status:** Accepted

**Date:** 2026-07-21

## Context

A positional scale used to apply logarithmic projection late, while training the scale after statistics. That made a chart labelled as logarithmic disagree with ggplot2 whenever a statistic depended on position: smooths fit the untransformed values, histograms chose bins in source space, and derived measures could be transformed twice or not at all. The old trained scale also exposed `type: "log"`, forcing guides and interactions to infer both a scale family and a transform from one field.

Position values now need three explicit spaces:

1. **semantic/source space** — parsed values retained for data, tooltips, events, authored limits, breaks, and inversion;
2. **transformed/scale space** — finite values after source-limit OOB handling and one `identity`, `log10`, or `sqrt` transform;
3. **pixel space** — the affine trained scale followed by post-stat coordinate projection.

Decision 0013 ordinarily requires a deprecation window for behavior changes. This change corrects pre-1.0 semantics rather than removing a supported appearance option.

## Decision

The positional pipeline is:

```text
parse → source-limit OOB/NA → scale transform → stat → position
      → affine scale training/expansion → guide → coordinate → render
```

Transforms are closed, portable names. PortableSpec continues to reject callbacks and regular expressions. Runtime columns cache transformed views by source column, parser, transform, limits, OOB policy, and missing-value replacement; source columns are never mutated.

Continuous scales report family `linear` plus `transform: identity | log10 | sqrt`. Authored `type: "log"` remains accepted input and canonicalizes to `{ type: "linear", transform: "log10" }`; a trained `type: "log"` no longer exists. Guides, render models, interval selections, bounds editors, and zoom use this family-plus-transform contract.

Explicit `domain`/`limits` are unexpanded source limits. The default `oob: "censor"` removes values outside those limits before statistics; `oob: "squish"` clamps first. Display expansion is a later affine concern and does not change OOB membership. Non-temporal continuous and binned scales default to 5% multiplicative expansion; time scales retain their existing behavior.

Stats declare output provenance:

- **source-applied** values pass through the axis program once;
- **scale-space** outputs computed from transformed inputs are never transformed again;
- **semantic-measure** outputs such as counts are forwarded once before position/training.

Zero-baseline geoms share one transformed-origin rule. Identity and square root map semantic zero to transformed zero. Log10 has no semantic-zero image, so bar/col/area/histogram/density use transformed origin zero (semantic one) and emit an advisory; explicit `zero: true` is rejected.

### Binned two-phase behavior

A binned position family chooses bounded edges in transformed space. Each source value receives:

- a stable internal integer bin id for count, stack, fill, and dodge grouping; and
- a transformed numeric center/edge for continuous statistics, jitter, scale training, and geometry.

Internal ids never enter guides, candidates, tooltips, or zoom. Synthesized rows inverse-project centers and edges to semantic values. Bins are right-closed with an inclusive lowest edge. Both schema and runtime share the 64-bin limit.

## Consequences

- Smooth, bin, density, summary, and boxplot computations now match scale-transform staging instead of late coordinate projection.
- Position offsets, stack totals, and numeric `stat_bin` `binwidth`/`boundary`/`center` are transformed-space units under log10/sqrt.
- Brush zoom writes semantic source domains with zero expansion and `nice: false`; because scale limits are pre-stat, zoom intentionally recomputes statistics on the visible subset. A future coordinate-transform PR owns post-stat visual zoom semantics.
- Source values and precision remain available to candidates and interactions.
- Scale and coordinate transforms remain observably different and cannot be merged into one late projection.
- Visual baselines move broadly because the new 5% non-temporal expansion is intentional.

## Compatibility policy

This is the explicit pre-1.0 semantic-correctness exception to decision 0013. There is no legacy late-transform branch and no dual staging mode. Keeping both would make the same portable spec mean different statistics depending on compatibility state. Migration guidance documents the corrected staging, OOB behavior, transformed units, expansion override, and family-plus-transform contracts.
