---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: overlaid density fills composite independently through alpha

Expand constant area/density alpha onto per-subpath alphas when a closed
batch has multiple groups. SVG group opacity was compositing opaque sibling
fills into an offscreen buffer first, so translucent overlaid densities
still occluded each other in the overlap region.

Migration: none — same author-facing alpha; only the render packing changes.
