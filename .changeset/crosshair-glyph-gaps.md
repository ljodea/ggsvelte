---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: gap xy inspect guides around nearby GeomText boxes

Hard-gap vertical and horizontal crosshairs through measured sibling
label AABBs in the focus panel so continuous scatter+text charts
(Langren/Tufte-style) keep both guides without bisecting name labels.

Migration: none — presentation only when inspect mode draws axis guides
and the panel has GeomText/GeomLabel glyphs.
