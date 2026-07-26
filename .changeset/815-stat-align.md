---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat: stat_align shared continuous-x grid for stack (#815)

Add `stat: "align"` on area and line layers. Union all finite x across groups,
linearly interpolate each series onto that grid, and set y=0 outside a group's
range so continuous-x stack/fill aligns.

Area/Line use own stat unions (not shared IdentityOrUniqueStat). Migration: none.
