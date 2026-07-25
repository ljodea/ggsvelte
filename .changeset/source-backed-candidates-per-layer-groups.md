---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

Fix candidate grouping on all-identity plots where layers carry their own
`data`. The source-backed strategy derived grouping from the plot's table, so a
layer with its own columns threw `deriveGroups: unknown field "..."` as soon as
candidates were resolved — and where it happened not to throw, it indexed a
plot-length array with a global row id and silently collapsed those rows into
one group. Grouping is now derived per owning table and indexed locally, the
same way value reads already were.

Migration: none — a plot that previously threw now renders, and per-layer series
grouping is correct where it was collapsed.
