---
"@ggsvelte/core": patch
---

# Narrow LayerFrame into core + per-geom payloads

Nest bin/dodge/smooth/box behind optional payloads so geometry modules own
their extras, and introduce FinalizedLayerFrame so post-assembly candidate
construction reads non-null lineage at the type level instead of a runtime
null throw on every call.
