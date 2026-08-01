---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor: probe-scoped hit geometry replaces the threaded containment memo

Internal only — no public API or behavior change. `createHitGeometry` now
hands out probe handles: `probePoint(px, py)` answers `distance`/`contains`
and `probeRect(lo, hi)` answers `intersects`, each owning its own
containment cache. The cache map no longer travels through four signatures,
and point and rect containment can no longer be mixed by mistake. The two
pass-through modules that only restated the interface — candidate-store-
spatial.ts and candidate-store-spatial-refine.ts — are gone, so a store now
builds one hit-geometry object instead of two.
