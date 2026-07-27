---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Add scale_*_hue / grey / gray / ordinal discrete colour helpers

Register portable schemes `hue`, `grey`, and `gray`, plus ggplot2-shaped constructors for color and fill. Custom hue h/c/l or grey start/end bake a 10-stop range; defaults use named schemes. `scale_*_ordinal` aliases discrete (#829).
