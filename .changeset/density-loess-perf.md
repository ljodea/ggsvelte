---
"@ggsvelte/core": patch
---

# Faster density and loess stats

Migration: none. Internal algorithm work; outputs preserved within the
repo's existing parity contracts (R fixtures unchanged and green).

Measured on a loaded x86_64 box:

- `pipeline density 100k`: **~749 → ~42 ms** (budget 150 ms). Groups well
  above the grid size now evaluate the KDE by linear binning onto the
  evaluation grid plus an exact discrete gaussian convolution — O(n +
  grid × taps) instead of O(n × grid) pairwise kernel evaluations.
  Binning conserves mass and uses the same ±8·bw-truncated kernel values
  as the direct window sum, so the paths agree to binning error — well
  under the 5e-4 R-parity tolerance (R itself approximates by binned
  FFT). Small groups keep the exact direct path, so the R fixtures are
  unaffected. New characterization tests pin agreement with an
  independent direct evaluation, mass conservation, and weight
  normalization.
- `pipeline loess 5k`: **~703 → ~239 ms** (budget 710 ms). The
  statistics loop's nearest-q window slides right monotonically across
  the sorted evaluation points (amortized O(n)) with a cold-selection
  fallback for single-x windows, and the weighted normal-equation
  moments accumulate once in scalar locals (bit-identical) instead of a
  per-point powers array plus a matrix rebuild per attempted degree.
