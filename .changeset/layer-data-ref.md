---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: optional per-layer `data` (DataRef) with multi-table pipeline support

Migration: none — additive

Layers may supply their own `{values}` / `{columns}` / `{name}` data; when
omitted they inherit plot-level data. Shared scales train over the union of
layer tables, facets replicate annotation layers that omit facet fields, and
`model.row()` resolves global multi-table source ids. Builder and declaration
geom sugar accept layer `data` as well.
