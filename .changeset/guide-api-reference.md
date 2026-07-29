---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(spec): export schema-derived `GUIDE_REFERENCE` for every guide type

`GUIDE_REFERENCE` / `guideReferenceList()` publish each public guide variant
(`legend`, `colorbar`, `colorsteps`, `axis`, `none`) with channels, props from
the matching `*GuideSpec`, and Svelte/helper names. The docs site uses this for
`/reference/guides`.

Migration: none — additive
