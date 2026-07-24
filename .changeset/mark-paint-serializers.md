---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# One mark-paint resolver for three serializers

Consolidate point/path paint style resolution (shapes, dash, stroke-null) into one `mark-paint` module shared by the SVG, canvas, and Svelte serializers.

Migration: none — additive public helpers; renderers keep the same visual output.
