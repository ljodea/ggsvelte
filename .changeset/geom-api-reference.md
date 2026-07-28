---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(spec): export schema-derived `GEOM_REFERENCE` for every geom

`GEOM_REFERENCE` / `geomReferenceList()` walk SpecDeclarations and publish
each geom's summary, defaults, allowed stats and positions, and param docs.
The docs site uses this for `/reference/geoms` so Svelte props stay in step
with `schema/v0.json`. Also documents five previously undescribed params
(`pointrange`/`crossbar` `funMin`/`funMax`, `function.args`).

Migration: none — additive public export
