---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: geom_blank for scale training without marks (#791)

Add ggplot2-style `blank` geom that trains scales from mapped aesthetics and
emits no geometry batches or interaction candidates. Surfaces: PortableSpec,
`geomBlank()`, and `<GeomBlank>`.

Migration: none — additive.
