---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat: stat_unique first-wins aesthetic dedupe (#813)

Add `stat: "unique"` for identity-capable geoms (point, line, path, text, col,
area, rect, ribbon, rule, segment, errorbar). Drops duplicate rows on the
combination of mapped aesthetic fields before drawing; first occurrence wins;
panel-local.

Not offered on bar/histogram/density/smooth/boxplot or tile/raster in this
release. Migration: none — additive.
