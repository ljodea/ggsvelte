---
"@ggsvelte/svelte": patch
---

# Resolve tooltip lineage keys by row index

Migration: none — internal

Building a tooltip snapshot materialized one row object per source row in a
candidate's lineage, then threw it away. `model.row` copies every column on each
call and has no cache, while the key resolver production wires in only ever
needs the index. For an aggregate or `geom_smooth` mark the lineage is the whole
group, so hovering one mark over a large group allocated a row per group member.

The coordinator now takes an index-keyed resolver, matching what production
already passed, and the lineage walk asks it directly. Measured on a 60-row
smooth: 120 row materializations before, at most 2 after.

`resolveInspection` keeps its row-shaped `keyOf` and builds the materializing
adapter itself, so that entry point is unchanged.
