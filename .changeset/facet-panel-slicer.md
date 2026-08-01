---
"@ggsvelte/core": patch
---

# Group facet rows once per layer instead of rescanning per panel

Migration: none — internal

Building panel frames called `sliceLayerForPanel` once per (panel, layer), and
each call walked the layer's whole filtered table to keep the rows belonging to
that panel. The panels partition the rows, so the useful work is one pass over
the layer, but the cost was one pass per panel: O(P x N) where P is the panel
count and N the filtered rows.

Group each layer's rows by facet key once, then answer each panel with a lookup.
Faceting on a 200-category field did 200 times the necessary row visits,
multiplied again by layer count, on the main bind path before stats and scale
training.

The replicate paths (unfaceted, or a layer carrying none of the facet fields)
also rebuilt an identical source-row array per panel; they now share one.

Slices are unchanged: same table instance or subset, same row order, same
source-row lineage, for wrap, grid, partial-field, and empty-panel shapes.
