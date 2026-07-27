---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

docs(svelte): rewrite the shipped agent skill artifact for the 0.12 API

The skill (`skills/ggsvelte/`, shipped in the package tarball) now teaches
child-layer composition as the canonical Svelte form, draws the JSON-vs-props
aes distinction, covers the 0.11.0 grammar-prop deprecation and codemod, and
adds a `references/` tree with exhaustive geom/stat/theme/palette/scale
inventories checked against the spec catalogs by `scripts/skill-content.test.ts`.
