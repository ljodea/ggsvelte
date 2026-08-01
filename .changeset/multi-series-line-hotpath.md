---
"@ggsvelte/core": patch
---

# Speed up multi-series line geometry and SVG path strings

Migration: none — same path vertices, group order, style-split rules, and SVG d strings for linear and step curves.

Cut redundant work on the competitive `line-3×N` path: continuous bucket finite-check without double normalize, skip x-sort when groups are already ordered, reuse style subpath arrays when stroke style is constant, monomorphic continuous position write, and a linear `pathData` fast path for dense SVG lines.
