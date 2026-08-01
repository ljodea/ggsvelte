---
"@ggsvelte/core": patch
---

# Vertical band axes: truncate over-wide labels instead of hiding short ones

Migration: none — same tick values and formatters; only which category labels stay visible under a left-margin width cap when thinning cannot shrink measured width, plus density thinning for crowded tall lists.

When a categorical Y axis (native band Y, or categorical-on-Y after `coord_flip`) overflowed the left-margin cap, layout doubled `labelEvery` until almost every label was gone, even when the widest survivor never left the labeled set. Width-driven doubling now commits only when `maxLabeledWidth` actually shrinks (probing further doublings when a single step is a no-op); otherwise the path truncates with ellipsis and keeps short siblings labeled. A separate density pass still raises `labelEvery` when band step is below label height + min gap so crowded lists do not stack.
