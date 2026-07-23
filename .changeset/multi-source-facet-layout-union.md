---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): union facet panel keys across complete per-layer DataRef sources

When several layer-local tables each carry the facet fields but different
levels, facet layout no longer stops at the first complete table. Panel keys
are the union of every complete source so later layers cannot introduce
orphaned levels.

Migration: none — corrects multi-table facet layout under per-layer data
