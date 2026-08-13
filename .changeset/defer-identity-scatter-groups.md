---
"@ggsvelte/core": patch
---

# Defer identity-scatter grouping until inspect

Migration: none — internal. Same group ids when inspect or the identity index reads them. Lines, stats, and dodge/stack still group during bind.

Identity `geom_point` never buckets by group to draw. `buildFrame` no longer interns discrete color into a per-row id vector on that path. The first read of `groups` / `inputGroups` derives the same first-seen ids as before.
