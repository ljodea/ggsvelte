---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): gap inspection crosshairs at the hover ring

Continuous x/y/xy guides no longer paint through the focused mark and
its hover ring. Each guide splits into segments that stop short of the
ring; rect hover chrome still draws continuous guides.

Migration: none — inspection chrome only
