---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Inspect x-guide advisories under coord_flip (#1409)

Product decision: mode `x`/`xy` bar/col advisories still fire under
`coord_flip`. The crosshair tracks the data-x band even when the guide is
horizontal on screen, so it still cuts the filled mark.

Catalog messages no longer claim the guide is always "vertical"; they name
`coord_flip` so agents do not treat flip as a free pass to keep x/xy inspect
on bar/col.
