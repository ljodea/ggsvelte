---
"@ggsvelte/core": patch
---

# Faster SVG mark emission

Migration: none. Internal renderer changes; emitted SVG is byte-identical
(snapshot suite green).

Measured on a loaded x86_64 box, min-of-many: `svg render scatter 100k`
**~177 → ~88 ms** (budget 130 ms); `svg render scatter 10k` **~26 → ~12 ms**
(budget 15 ms).

- `renderPoints` grows one string monomorphically (the existing
  `pathRingData` pattern) instead of a 100k-slot parts array plus final
  join, reads style fields inline exactly as `resolvePointMark` does, and
  emits circles — the scatter default — directly with the opacity
  attribute composed in place. The old path computed
  `pointShapeGeometry` twice per mark (once in `resolvePointMark`, once
  in `pointShape`) and applied opacity via a per-mark string `.replace`.
  Non-circle shapes keep the exact `pointShape` + replace path.
- Rect, segment, and glyph emitters get the same parts-array →
  single-string conversion.
