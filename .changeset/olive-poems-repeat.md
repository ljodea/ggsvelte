---
"@ggsvelte/core": patch
---

# Decide the stacked-area align rescue without rescanning the grid per group

Migration: none — internal

Before rewriting a stacked-area frame, the auto-align rescue asks whether any
group skips a shared-grid x inside its own range. It answered by walking the
sorted grid once per group, and the "before this group starts" arm was a
`continue` rather than a seek, so every group also paid for the whole prefix
of grid values below its own minimum.

Groups and distinct x both grow with the data and neither is capped, so that
scan cost groups × grid-x. It now ranks the grid once and compares each group's
size against the width of its own window, which is the same question answered
by subtraction: every value a group holds is a grid value inside `[min, max]`,
and `min` and `max` are themselves members, so the group is dense exactly when
it holds one value per grid slot in that window.

The decision is unchanged for every input, and so is the frame that follows
from it.

Scope honestly: the shape this helps is many series that each cover a dense
window of a wider shared grid. A tidy stack where every group covers the whole
grid already short-circuited on a size check, and when a group really does have
a hole the rescue's own row expansion dwarfs the scan. On 100 staggered series
over a 10,000-value grid the scan read 505,000 grid slots; it now reads 10,000.
