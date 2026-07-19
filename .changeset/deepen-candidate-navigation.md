---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
---

# Delegate keyboard navigation to CandidateStore

Let `CandidateStore.traverse()` apply modular sequential steps and preserve
paint order for directional ties. Svelte inspection now delegates sequential,
directional, and coincident keyboard navigation to the model-owned store
without materializing a second candidate traversal list.

Migration: <https://ljodea.github.io/ggsvelte/guide/upgrading#0-2-to-0-3>
