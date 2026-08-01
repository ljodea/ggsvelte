---
"@ggsvelte/core": patch
---

# Gather the y window per grid row in the 2-D KDE

Migration: none — internal

`productKdeGrid`, which builds the density surface behind `geom_density_2d`,
sorted samples by x and slid an x window across each grid row, but tested y one
sample at a time in the innermost loop. Every grid row therefore re-walked the
whole x band and threw away the samples outside `±8σy` individually. It now
gathers each row's y window once, so neither axis is scanned per cell.

The share of wasted visits grows with the data, because the bandwidth shrinks as
`n^(-1/5)` while the x band keeps admitting the same fraction: 16% of visited
pairs cleared no y window at n = 200, 64% at n = 20 000. On a 4 000-point cloud
over the default 100 × 100 grid the visit count drops from 9.50M to 2.25M, and a
50 000-point cloud renders 1.29× faster end to end.

The surface is unchanged bit for bit — the gather keeps samples in ascending-x
order, so the kernel terms are still added in the same sequence, and a
non-finite `y` is still admitted rather than dropped. When the y window already
reaches every row there is nothing to prune, so the gather is skipped and the
sorted arrays are read directly.
