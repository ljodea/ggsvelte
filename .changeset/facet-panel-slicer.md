---
"@ggsvelte/core": patch
---

# Group facet rows once per layer instead of rescanning per panel

Migration: none — internal

Building panel frames sliced each layer once per panel, and each slice walked
the layer's whole filtered table to keep the rows belonging to that panel. The
useful work is one pass over the layer, but the cost was one pass per panel:
O(P x N) where P is the panel count and N the filtered rows.

Group each layer's rows by facet key once, then answer each panel with a lookup.
Faceting on a 200-category field did 200 times the necessary row visits,
multiplied again by layer count, on the main bind path before stats and scale
training.

The replicate paths (unfaceted, or a layer carrying none of the facet fields)
also rebuilt an identical source-row array per panel; they now share one.

Slices are unchanged for every layout the pipeline can build: same table
instance or subset, same row order, same source-row lineage, across wrap, grid,
partial-field replication, absent facet values, and empty tables. A panel
identity missing a facet field its layer partitions on now throws where it used
to replicate — no facet form can produce that, since `assertFacetForm` rejects
wrap mixed with grid and every degenerate layout collapses to the unfaceted
path.

The trade is retained memory: each layer holds its grouping for the whole panel
loop, so a many-layer faceted plot carries roughly one extra index per row per
layer, where the per-panel arrays were previously garbage as soon as each frame
copied them.
