---
"@ggsvelte/core": patch
---

# Intern a stat mark's group lineage once instead of once per mark

Migration: none — internal

A stat mark's lineage is the whole group it summarizes. The per-group row bucket
is built once and frozen, and `LineageStore` interns such an array by identity so
a group is tokenized once however many marks point at it. Two things defeated
that, and either one alone kept the work at marks × group rows:

- The represented-rows fallback returned `[...baseRows]`. A clone is not frozen,
  so it never matched the identity cache and every mark paid a fresh set build,
  sort and join over its whole group. The three indexed arms directly above it
  already return the shared frozen bucket for exactly this reason.
- The cache lookup sat behind `Object.isFrozen`, which walks the array in this
  engine. Guarding a hash lookup with a linear check costs one pass over the
  members per call — the very rescan the cache exists to avoid.

Both quantities grow with the data: marks are stat output rows, and a group's
size is a share of the input. For a single-group plot both are the row count, so
the cost was quadratic. Measured on a `stat: "ecdf"` line, forcing the deferred
candidate store:

| rows | before   | after |
| ---- | -------- | ----- |
| 2000 | 572 ms   | 38 ms |
| 4000 | 1987 ms  | 54 ms |
| 8000 | 10203 ms | 84 ms |

A `stat: "connect"` line goes from 21135 ms to 100 ms at 8000 rows. The curve is
now flat where it used to quadruple with each doubling.

This is construction work behind a lazy gate, so it does not show up in render
timings — it lands as a freeze on the first hover, hit-test or keyboard
traversal after a render.

Lineage membership is unchanged: stats that narrow their group (`smooth`,
`summary`, `boxplot`, binned counts) still clone and filter.
