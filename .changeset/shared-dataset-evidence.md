---
"@ggsvelte/spec": patch
---

# Resolve a shared named dataset once, not once per layer

Migration: none — internal

Data-aware validation resolved each layer's data independently. A layer naming a
dataset paid a full pivot of `{values}` rows into columns plus type inference
over every column — so L layers naming one dataset did that work L times on one
unchanged table.

Resolve each name once and reuse it, for both the pivot and the type inference,
seeded from the plot's own dataset so a layer naming the plot's table shares it
rather than rebuilding. That matches the row accounting, which already counts a
shared name once.

Row and byte limits are unchanged: a shared name still counts once, and inline
layer data still gets its own table, since equal content is not the same table.
