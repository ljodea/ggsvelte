---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
"@ggsvelte/cli": patch
---

# Share frozen band domain across facet guide plans

Migration: none — internal memory hygiene; guide plan domain contents and freeze contract unchanged.

Under fixed facet scales, band axis guide plans reused to copy `scale.rawDomain`
once per panel. Reuse the already-frozen array when present so panels share one
object. Free scales still get distinct domains because each panel trains its own
`rawDomain`.
