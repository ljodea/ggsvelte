---
"@ggsvelte/svelte": patch
---

# Expand shared lineages once on precise-bounds recompute

Migration: none — internal precise-bounds apply path only; same interval keys and lineageCount.

Precise-bounds apply now domain-filters candidates before expanding `lineage.keys()`, and expands each lineage id once among matches (smooth/aggregate eval grids no longer re-spread the same bag once per mark). Semantic keys resolve only for in-interval candidates.
