---
"@ggsvelte/core": patch
---

# Cut multi-series line / ordinal color mount cost

Migration: none — same marks, group ids, and ordinal color assignments; competitive canvas adapter only changes harness chrome (void + color guide none) and data feed (named ref).

Further #1468 hot-path work: `fieldType` reuses lean parse decisions (no second typeof walk); ordinal color training skips materializing a 30k values array when the source catalog is enough; continuous line geometry can bucket+pixel-map in one normalize pass; solid multi-series canvas strokes take a monomorphic path; identity frames fill `rowIndex` without `Uint32Array.from` callbacks. Competitive canvas mount uses named data + theme_void + `{ type: "none" }` color guide so legend layout is not paid on a marks-only fixture.
