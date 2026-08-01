---
"@ggsvelte/core": patch
---

# Vertical band axes: truncate over-wide labels instead of hiding short ones

Migration: none — same tick values and formatters; only which category labels stay visible under a left-margin width cap when thinning cannot shrink measured width.

When a categorical Y axis (native band Y, or categorical-on-Y after `coord_flip`) overflowed the left-margin cap, layout doubled `labelEvery` until almost every label was gone, even when the widest survivor never left the labeled set. Doubling now commits only when `maxLabeledWidth` actually shrinks; otherwise the path truncates with ellipsis and keeps short siblings labeled.
