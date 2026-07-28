---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(spec): export schema-derived `POSITION_REFERENCE` for every position

`POSITION_REFERENCE` / `positionReferenceList()` publish each position
adjustment's summary, `positionParams` (from the PositionParams schema for
jitter/nudge), and compatible geoms. The docs site uses this for
`/reference/positions`.

Migration: none — additive
