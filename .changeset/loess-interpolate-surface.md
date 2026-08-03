---
"@ggsvelte/core": patch
---

# Faster large-n loess (interpolate surface)

Migration: none. Internal algorithm work; small-n outputs stay on the
existing direct/exact path (R fixtures 23–24 bit-identical).

For groups with more than 500 rows, loess switches to an interpolate
surface modeled on R's default `surface="interpolate"` /
`statistics="approximate"` path (1D kd-tree-style median partition, cubic
Hermite blend of vertex fits, approximate SE). The previous direct path
fitted a local model at every data point (O(n·q) with q ≈ span·n) and
allocated a fresh weights buffer per evaluation; large-n SE was hundreds
of milliseconds with large allocation churn.

Measured `pipeline loess 5k` (loess+se, forced method): hundreds of ms →
low double-digit ms; budget 710 → 45 ms. Scratch weights/`l` buffers are
reused on both surfaces. New fixture 25 pins the large-n path against R's
default loess.
