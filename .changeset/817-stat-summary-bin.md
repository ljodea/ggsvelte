---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

# feat: stat_summary_bin continuous x binned y summary (#817)

Add `stat: "summary_bin"` on point, line, and errorbar — bin continuous x with
the same break rules as `stat_bin`, then summarize y per non-empty
(group × bin) with the shared summary fun registry (default mean ± se).

Emits `x` (bin center), `xmin`/`xmax`, and `y`/`ymin`/`ymax`. Empty bins are
omitted. No weight channel, no summary_2d/hex in v1.

Migration: none — additive
