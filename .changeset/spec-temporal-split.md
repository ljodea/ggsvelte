---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

Split temporal parsing into parse engines, column inference, and a thin authoring facade so domain edits do not require reading the full module. Public package exports and `./temporal.js` re-exports are unchanged.
