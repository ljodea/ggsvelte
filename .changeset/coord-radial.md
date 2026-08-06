---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: coord_radial / coord_polar polar coordinates

Port ggplot2 `coord_radial` (and the superseded `coord_polar` alias) for pie charts, coxcombs, and polar scatter.

- PortableSpec `{ type: "radial", theta?, start?, end?, innerRadius?, expand?, clip?, reverse?, thetaLimits?, rLimits? }`
- Helpers `coordRadial` / `coord_radial` and `coordPolar` / `coord_polar` (polar maps to radial with clip on)
- Builder `.coordRadial()` / `.coordPolar()` and Svelte `<CoordRadial>` / `<CoordPolar>`
- Core joint polar projector: points, filled sector paths from rects/cols/bars, path/segment tessellation
- Square full-circle data rectangle; clip defaults off for radial and on for the polar alias

Migration: none — additive. Prefer `coord_radial` for new work; `coord_polar` remains for ggplot2 spelling parity.
