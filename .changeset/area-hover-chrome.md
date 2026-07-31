---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): no point-circle hover chrome on filled area stacks

Hovering or pinning a stacked area band drew the translucent hover ring — a
point-mark affordance — at the anchor. Closed path fills (area, density,
polygon) now use the same mute/continuous-crosshair chrome as rects, matching
the selection/legend emphasis rules. Open path strokes (lines) keep the ring,
which gaps the crosshair at the focused vertex.
