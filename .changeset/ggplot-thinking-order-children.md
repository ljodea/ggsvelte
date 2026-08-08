---
"@ggsvelte/skill": patch
"@ggsvelte/svelte": patch
---

# Document GGPlot children in ggplot2 thinking order

Migration: none — docs and skill convention only. Svelte examples, the agent
skill, and the package README now author mark layers first, then scales /
coords / facets, then theme / guides / labs, with host-only `<Inspect>` last.
Runtime assembly was already bag-based; child interleave does not change the
PortableSpec beyond mark z-order and last-wins folds within a grammar family.
