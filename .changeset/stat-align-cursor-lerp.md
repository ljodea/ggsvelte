---
"@ggsvelte/core": patch
---

# Interpolate statAlign from the merge cursor

Migration: none — same aligned grid, y values, and source-row lineage; lower cost on large G·U expansions.

`statAlign` no longer binary-searches each group's series once per shared-grid
x. The merge cursor already used for source-row lineage supplies the
interpolation bracket, so the per-output-row path is linear in the expansion
size.
