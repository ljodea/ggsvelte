---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor(core): collapse the finalize pipeline chain into one module

The finalize phase had hop-only modules that only redeclared and
forwarded the same run-state blob. One entry, `finalize(PipelineRunState)`,
now owns layout → geometry → contracts → candidates → RenderModel.
Layout and geometry stay in their own files. Public `RenderModel` shape
is unchanged.

Migration: none — internal collapse only
