---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Add scale_*_viridis_{c,d,b} helpers and viridis-family schemes

ggplot2-shaped `scaleColorViridisC/D/B` (and fill/colour/snake aliases) with `option` (viridis, magma, plasma, inferno, cividis, turbo) and `direction`. Expands named sequential schemes; discrete helpers bake a 10-stop range rather than putting sequential schemes on ordinal (#828).
