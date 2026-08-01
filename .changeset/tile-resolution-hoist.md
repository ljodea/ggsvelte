---
"@ggsvelte/core": patch
---

# Derive tile resolution once per axis instead of once per row

Migration: none — internal

`emitBandTiles` passed `defaultResolution(frame.xNumeric)` straight into a call
inside its per-row loop. JavaScript evaluates arguments eagerly, so a continuous
axis re-derived that value on every row even when a mapped or param width made
the callee ignore it. `resolution()` scans the whole column into a Set and sorts
the distinct values, so a `geom_tile` heatmap on continuous axes was O(n²) in
its cell count: a 200x200 grid scanned 40,000 values 40,000 times, per axis.

Derive it once per axis before the loop. Band axes are unchanged — they pass a
literal `1` and never reach `resolution()`.

Output is identical for every input; only how often the value is derived changes.
