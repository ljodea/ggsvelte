---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Add scale_*_gradient / gradient2 / gradientn helpers

ggplot2-shaped continuous colour constructors for color and fill: two-stop `gradient`, three-stop diverging `gradient2`, and n-stop `gradientn` (colours/colors/values). Map onto sequential scales with explicit range (#826). No asymmetric `midpoint` domain remapping in v1.
