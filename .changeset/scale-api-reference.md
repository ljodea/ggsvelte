---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(spec): export schema-derived `SCALE_REFERENCE` for every Scale* surface

`SCALE_REFERENCE` / `scaleReferenceList()` publish each public scale helper
from `SCALE_CAPABILITIES` (plus Colour/Ordinal aliases) with family, aesthetics,
params from position/color/style schemas, and guide notes. The docs site uses
this for `/reference/scales`.

Migration: none — additive
