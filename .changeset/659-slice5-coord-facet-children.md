---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: coord + facet children + deprecate GGPlot `coord` / `facet` props

Ship declaration-only `<Coord>` / `<CoordFlip>` / `<CoordFixed>` /
`<CoordEqual>` / `<CoordTransform>` / `<CoordCartesian>` and `<Facet>` /
`<FacetWrap>` / `<FacetGrid>` children (stable-intent). Both families are
REPLACE (last child wins over props and earlier children). Deliver
`DEPRECATED_PLOT_PROP` for the `coord` and `facet` props (since 0.11.0,
remove in 0.13.0) and `DUPLICATE_PLOT_LAYER` when two coord, facet, or theme
children are registered (composition diagnostics become a discriminated
union with the existing `DUPLICATE_SCALE_CHANNEL` scale variant).

Migration: <https://ggsvelte.sh/guide/upgrading#compose-coord-as-a-child-layer>
Migration: <https://ggsvelte.sh/guide/upgrading#compose-facet-as-a-child-layer>
