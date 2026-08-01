---
"@ggsvelte/svelte": patch
---

# Assemble snapshots each layer once, not twice

Migration: none — same assembled PortableSpec and mutation isolation; one less
O(rows×cols) deep copy per layer with inline data on every assemble.

`assemblePortableSpec` already snapshots layers before folding non-mark
grammar children. `materializeAndNormalize` no longer re-snapshots them before
Date→ISO materialization.
