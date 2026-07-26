---
"@ggsvelte/spec": minor
"@ggsvelte/core": patch
"@ggsvelte/svelte": minor
---

# Add bare scale_alpha / scale_linewidth and ordinal style aliases (#832)

ggplot2 ergonomics for style scales:

- Bare `scale_alpha` / `scale_linewidth` → continuous helpers
- `scale_alpha_ordinal` / `scale_linewidth_ordinal` / `scale_shape_ordinal` (and camelCase peers) → existing discrete helpers (`type: "ordinal"`)
- Svelte re-exports: `<ScaleAlphaOrdinal />`, `<ScaleLinewidthOrdinal />`, `<ScaleShapeOrdinal />` (same shells as Discrete)

Deferred: `scale_shape_continuous` / `scale_linetype_continuous` (ggplot2 warns/errors).

Migration: none — additive
