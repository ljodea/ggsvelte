---
"@ggsvelte/core": patch
---

# Store categorical point colors as palette indexes

Migration: none — internal. Same resolved fills. Continuous high-cardinality ramps still emit a string per mark.

Categorical identity scatter no longer allocates a hex string per point. The batch keeps a short palette and a `Uint8Array` of indexes. Canvas fills once per palette entry.
