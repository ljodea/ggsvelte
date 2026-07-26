---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor(#659): compose the repo's own charts as child layers (slice 8)

The docs site, the getting-started tutorial, the package README, the bundled
agent skill, and the clean-consumer compatibility harness no longer pass the
grammar props deprecated in 0.11.0 — they use `<Scale>`, `<Labs>`, `<Guides>`,
`<Coord>`, `<Facet>`, and the theme shells instead. A new guard runs
`ggsvelte-codemod`'s own transform over those sources and fails if any of them
would still change.
