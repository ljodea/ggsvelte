---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): legend emphasis mute-only for non-point geoms

Legend/controller series highlight no longer stamps dashed rings on every
path vertex, area edge, segment midpoint, or dense point cloud.

- Rings only for `points` batch marks; paths, rects, segments, and glyphs
  use mute-only de-emphasis (`interactionMuted` alpha)
- Legend emphasis density-gates rings: more than 48 ring anchors demotes
  all emphasis rings to mute-only so dense series stay readable
- Point selection rings are ungated (select still highlights every chosen
  point)
- Grouped gallery examples (area/bar stack, dodge, multi-series line,
  scatter) enable `legendFocus` for interactive QA

Migration: none for typical charts. Charts that relied on path/area
vertex rings for emphasis now mute non-focused series only — the intended
bar/col look.
