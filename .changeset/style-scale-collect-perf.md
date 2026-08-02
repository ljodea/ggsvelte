---
"@ggsvelte/core": patch
---

# Faster mapped-style scale training and collection

Migration: none. Internal-only performance work; no public API or behavior
changes.

Measured on a loaded x86_64 box, min-of-20 reps of `pipeline mapped-style
100k` (budget 132 ms): **~124 → ~56 ms**.

- The source-catalog walk encodes each value once per row (was twice:
  `indexableKeys` and the catalog dedupe kept separate `Set` addictions).
- Provably-continuous aesthetics (sequential/binned/identity numeric style
  scales) skip the full-column catalog dedupe walk entirely — the discrete
  resolutions that read the catalog are unreachable, decided from field
  discreteness metadata, never row data.
- A single mapped frame (the common case) aliases its value column instead
  of rebuilding it with one push per row; multi-frame plots and
  Float64Array frame columns keep the historical concatenation.
- `deriveGroups` interns homogeneous primitive single columns directly
  (SameValueZero groups exactly like the `cellKey` string, NaN/±0
  included), falling back to the canonical key path on the first Date or
  mixed-type column.
- All-number style value columns convert to their semantic Float64 view in
  one fused loop instead of a per-element `cellToNumber` callback inside
  `Float64Array.from`.
