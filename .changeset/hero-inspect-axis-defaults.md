---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: quieter point inspection and readable axis/tooltip chrome

- Points and text auto-inspect as `exact` (hover ring only), not full `xy`
  crosshair grouping — axis modes remain opt-in (`mode: "x"|"y"|"xy"`).
- Default tooltips omit the shared axis field under `x`/`y` mode and humanize
  camelCase column names for `<dt>` labels.
- Raise light/minimal-family `axisTextSize` (8.8 → 12), base `axisTitleSize`
  (9 → 11.5), and reduce default tooltip font size (16 → 12.5) so tick labels
  are readable next to titles and tooltips.

Migration: none for most plots. If you relied on `inspect: true` / auto mode
drawing a full crosshair on scatter points, set `inspect={{ mode: "xy" }}`
(or `"x"` / `"y"`) explicitly. Visual baselines for light-theme smoke shots
refresh with the larger axis type.
