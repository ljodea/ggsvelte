---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(spec): export schema-derived `STAT_REFERENCE` for every stat

`STAT_REFERENCE` / `statReferenceList()` publish each statistical transform's
summary, after_stat columns (`STAT_COLUMNS`), and compatible geoms (inverted
from `GEOM_REFERENCE`). The docs site uses this for `/reference/stats`.

Migration: none — additive
