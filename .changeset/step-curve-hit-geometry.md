---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): hit-test stepped paths against the stairs the renderer draws, not the straight chord between authored vertices. `geom_step` (and `geom_line`/`geom_path` with `curve: "step" | "step-hv" | "step-vh"`) carried the step shape as a render-time flag, so hover and brush measured a line the user never saw — a pointer resting on the drawn stroke could report no hit at all. `path-step` now owns the drawn polyline for one authored edge and both the renderers and `closestPathEdge`/`pathSegmentsIntersectRect` read it.
