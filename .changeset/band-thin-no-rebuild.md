---
"@ggsvelte/core": patch
---

# Band-axis tick thinning no longer rebuilds every tick on each halving

Migration: none — same chosen labelEvery, tick values, labels, and labeled flags;
lower cost when a vertical band axis has many categories.

Vertical band axes used to call `deriveTicks` once per `labelEvery` doubling
during margin degradation. Only the `labeled` flag depends on every, so the
loop now flips flags in place after a single derivation.
