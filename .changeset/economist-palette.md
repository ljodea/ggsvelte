---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

feat(scale): economist categorical palette (ggthemes scale_colour/fill_economist)

Registers the `economist` scheme for ordinal color/fill scales: the nine
ggthemes Economist fg colors in the fill palette's full-capacity order
(blue-gray, dark blue, blue, light blue, dark green, light green, dark red,
pink, gray). ggthemes re-selects hues per n; this port flattens to the fixed
n = 9 order, so prefix subsets approximate the smaller-n picks. The docs
themes page now demos the Economist theme with its own palette, and the
palettes page gains the Economist card.

Migration: none — additive scheme name only.
