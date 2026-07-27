---
"@ggsvelte/svelte": minor
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

Remove the seven deprecated grammar props from `<GGPlot>` (`theme`, `scales`,
`coord`, `facet`, `labs`, `guides`, `legend`) and the `LayerDescriptor` type
alias. Compose grammar as declaration-only children; use
`MarkLayerDescriptor`. Run `npx ggsvelte-codemod --write` on old source.

Migration: <https://ggsvelte.sh/guide/upgrading#0-12-to-0-13>
