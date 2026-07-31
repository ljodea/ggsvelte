---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor: shared mark style resolvers for rects, segments, glyphs

`@ggsvelte/core` now exports `resolveRectMark`, `resolveSegmentMark`, and
`resolveGlyphMark` (with their `Resolved*Mark` types) beside the existing
point/path resolvers, completing the renderer-neutral style table. The SVG
string renderer, the canvas drawers, and the Svelte `Batch` component all
resolve per-mark fill/stroke/dash/alpha through these shared functions.

No rendering behavior changes — emitted SVG, canvas draw calls, and DOM
output are unchanged. `@ggsvelte/svelte` picks up the internal refactor of
`Batch.svelte` only.
