---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat: default row identity without requiring GGPlot `key`

Interaction identity resolves to an `id` column when present, otherwise
the row index. Ordinary charts omit `key`; the prop remains an optional
override for non-`id` natural keys. Legend focus and point selection no
longer require an explicit key for the default path.

Migration: none required. Remove redundant `key="id"` from charts whose
rows already expose an `id` field.
