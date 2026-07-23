---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: do not disable legend filters when a hidden rowless annotation scaled-constant shares a style scale

A data field mapping + annotation `rule` constant on the same discrete style
scale still exposes filter controls for the visible data categories. Rowful
scaled constants that appear as legend entries remain non-filterable.
