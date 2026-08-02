---
"@ggsvelte/core": patch
---

# Faster small-chart fixed overhead

Migration: none. Internal changes; outputs preserved (differential-tested
and snapshot-green).

Measured on a loaded x86_64 box, min-of-many: `pipeline stacked-bars 50x4`
**~1.7 → ~1.1 ms** (budget 1.1 ms), `svg render stacked-bars 50x4`
**~2.1 → ~1.1 ms** (budget 1.3 ms).

- Tick labels no longer pay one `toLocaleString` ICU call per label per
  render. `formatEnUS` rounds the shortest decimal representation half-up
  — matching ICU exactly, including the `1.005 → "1.01"` case `toFixed`
  gets wrong — with exponential-repr values delegating to ICU; wired into
  `defaultTickFormat`, `defaultLogTickFormat`, and the `scales.*.labels`
  format-string helper. Differential-tested over 1M+ cases.
- Multi-column group interactions (category × fill) intern each column
  raw and fold per-row intern ids into one numeric key instead of
  building per-row `cellKey` join strings; tuple identity and first-seen
  group numbering match the canonical path exactly, with fallback for
  non-primitive columns.
