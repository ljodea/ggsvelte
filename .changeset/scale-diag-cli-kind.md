---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

Map scale-diagnostic severity onto the CLI stderr `kind` field 1:1 so error-severity diagnostics emit `kind: "error"` instead of being demoted to `warning`.
