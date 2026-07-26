---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_curve curved connectors (#794)

Add ggplot2-style `curve` geom: curved connectors from (x,y) to (xend,yend)
tessellated as a quadratic Bezier in panel px (aspect-safe curvature). Params:
curvature (default 0.5), angle (degrees, default 90), ncp (density knob).
One path subpath per row; one semantic candidate per curve.

Intentional subset: quadratic Bezier approximation, not full grid xspline.
Migration: none — additive
