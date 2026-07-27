---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add ColorBrewer scale helpers (#825)

- Palette tables (public ColorBrewer max-n hex) + scheme registration
- `scale_*_brewer` (discrete), `scale_*_distiller` (continuous), `scale_*_fermenter` (binned)
- color/colour/fill spellings + Svelte `<ScaleColorBrewer />` etc.
- `palette` → `scheme`, `direction: -1` → `reverse: true`

v1 palettes: Set1/2/3, Dark2, Paired, Accent; Blues/Greens/Reds/Oranges/Purples/Greys/YlOrRd/YlGnBu/BuPu; RdYlBu/RdBu/BrBG/Spectral/PuOr.

Migration: none — additive
