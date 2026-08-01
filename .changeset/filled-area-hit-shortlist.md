---
"@ggsvelte/core": patch
---

# Shortlist filled-area hits by subpath, not every vertex

Migration: none — same hit ids and brush membership; lower pointer cost on dense areas.

Filled path geometry (stacked `geom_area`, ribbons, bands) used to put every path
vertex into the spatial shortlist. A stacked area of a few thousand rows then
paid tens of milliseconds per hover. Index one AABB per filled subpath, expand
to the winning vertex only after containment or axis-snap, and keep brush
`queryRect` returning every vertex of a hit subpath.
