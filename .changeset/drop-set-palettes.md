---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

Remove ColorBrewer Set1/Set2/Set3 categorical schemes

Migration: <https://ggsvelte.sh/guide/scales-guides>

Drop the poorly named Set1/Set2/Set3 palettes from the scheme registry,
runtime tables, docs catalog, and agent skill. Dark2, Paired, and Accent
remain. Specs that used `scheme: "Set1"|"Set2"|"Set3"` (or brewer
`palette` of those names) no longer validate — switch to another ordinal
scheme (e.g. `Dark2`, `tableau10`, `colorblind`) or an explicit `range`.
