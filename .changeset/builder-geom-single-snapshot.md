---
"@ggsvelte/spec": patch
---

# Builder geom sugar deep-copies layer data once, not twice

Migration: none — same `.spec()` output and mutation isolation; one less
O(rows×cols) snapshot on `geom*({ data })`.

`layerFrom` no longer calls `toAuthoringDataRef`. Every geom sugar path is
`this.layer(layerFrom(...))`, and `layer()` remains the single defensive copy.
