# 0020 — Fixed aspect constrains the data rectangle

- Status: accepted
- Date: 2026-07-22

## Context

A fixed outer SVG ratio does not preserve data-unit lengths because titles, axes, facet strips, and responsive guides consume asymmetric space. Stretching the remaining panel would make circles elliptical and slopes visually false. Free positional facet scales also cannot share one honest physical data-unit ratio.

## Decision

`coord_fixed` is a post-chrome layout constraint, not a data transform.

1. Resolve title/caption, axes, facets, and responsive guide reserves normally.
2. Compute the required data-rectangle aspect as `ratio * yScaleSpaceSpan / xScaleSpaceSpan`, where `ratio` is physical y-unit length divided by physical x-unit length.
3. Fit the largest centered rectangle with that aspect inside the panel allocation. Fixed-scale facets use one equal fitted size that fits every allocation.
4. Keep panel background, grid, clips, geometry, axes, strips, and interactions on the fitted rectangle. Paint the unused allocation with the theme-owned `letterboxFill` role, which defaults to paper.
5. Reject any free positional facet scale structurally and defensively at runtime.
6. Never distort the ratio. If either fitted dimension is below 64 px, remove minor furniture, coarsen automatic ticks, publish `data-gg-layout="degraded"`, and emit one `coord-fixed-degraded` author warning.

The portable API is `{ "type": "fixed", "ratio"?: number }`. `coordFixed`, `coord_fixed`, `coordEqual`, and `coord_equal` are aliases over one implementation; the canonical equal-unit ratio omits `ratio: 1`.

## Consequences

- Physical data-unit comparisons remain truthful across responsive sizes.
- Letterboxing is explicit renderer-independent scene data rather than accidental whitespace.
- Title/caption and guide allocation remain stable while the data rectangle can move inward.
- Extremely constrained plots remain exact but openly degraded.
- Fixed aspect cannot compose with `coord_flip`, `coord_transform`, or free facets in one current PortableSpec; the closed coordinate union rejects ambiguous composition.
