---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Complete mapped style aesthetics

Add complete mapped size, linewidth, alpha, shape, and linetype scale plumbing across strict authoring helpers, grouping, stats, SVG/Canvas/SSR rendering, style-aware legends, inspection, and hit testing.

Discrete and binned style mappings now participate in implicit grouping. Review layered path geoms and add an explicit `group` mapping where style categories are descriptive rather than structural. Mapped `alpha` is the complete opacity aesthetic rather than a value multiplied by a scalar geom `alpha`; set the scale range to bound mapped opacity.

Migration: <https://ggsvelte.sh/guide/upgrading#0-7-to-0-8>
