---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: humanize default axis and legend titles from field names (#961)

When `labs` omits a channel, guide titles now use `humanizeFieldTitle` —
camelCase/snake_case field names become sentence case (`bloomRefDate` →
`Bloom ref date`). Single-token names (`year`, `Region`, `count`) stay as
authored. Explicit `labs` values (including `""` to hide) are unchanged.

Also exports `spaceFieldName` / `humanizeFieldTitle` from `@ggsvelte/core`;
tooltip `<dt>` labels share the spacing helper.

Migration: none — additive

Default axis/legend titles for multi-word field names change from raw
identifiers to sentence case (e.g. `bloomRefDate` → `Bloom ref date`). Set
`labs` explicitly to keep a previous string.
