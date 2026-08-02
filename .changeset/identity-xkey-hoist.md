---
"@ggsvelte/core": patch
---

# Hoist candidate identity x-key column views once per frame

Migration: none — group×x bucket keys and lineage membership stay byte-identical;
only per-row conversion/parsed/position column work is removed from the identity index loop.
