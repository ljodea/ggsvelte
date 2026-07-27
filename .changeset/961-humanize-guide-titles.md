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
