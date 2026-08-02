---
"@ggsvelte/core": patch
---

# Hoist source-backed candidate row locate once per mark

Migration: none — candidate datum fields stay byte-identical; only repeated
`SourceRegistry.locate` work for the same global row is removed from the
source-backed datum resolver.
