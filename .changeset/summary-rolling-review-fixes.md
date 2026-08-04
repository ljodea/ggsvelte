---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: close three summary_rolling contract gaps found in review

- `params.fun` "first"/"last" on summary stats silently plotted the window
  **maximum** (the point/line params union admits manual's keep transforms;
  `applySummaryFun`'s default branch aliased max). Tier-2 validation now
  rejects them with a named `summary-fun-unsupported` error, and the core
  summary registry throws on any out-of-registry fun as a backstop.
- Tooltips on rolling-summary charts advertised only x; `summary_rolling`
  now publishes its summarized y to inspection like `summary_bin`.
- Spec validation accepted `{ stat: "y" }` channels the renderer rejects:
  the style after-stat map now publishes `summary_rolling: ["y"]` (mirroring
  `summary_bin`), and the validator checks the y channel against the
  y-mappable column table (also closing the identical pre-existing
  `summary_bin` y-channel gap).

Migration: none — invalid specs now fail validation instead of rendering
wrong (or crashing); valid specs are unaffected
