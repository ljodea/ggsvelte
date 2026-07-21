# PR 4 plan — post-stat `coord_transform` and projector

## Goal

Ship a coordinate transform that is observably different from a scale transform:

`input → scale transform → stats/positions → scale training/guides → coord transform → rendering/interactions`.

This PR adds a public, portable `coord_transform` surface; a post-stat projector; adaptive path tessellation; separate semantic candidate anchors; inverse composition for interval/zoom interactions; diagnostics; docs; evidence; and bounded performance.

## Public contract

- Portable JSON adds a strict `CoordTransformSpec` coordinate variant.
- `x` and `y` independently accept `identity`, `log10`, or `sqrt` coordinate transforms.
- Coordinate transform options remain JSON-only. No callbacks or regexes.
- `coordTransform(options)` and `coord_transform(options)` return canonical coordinate fragments; builder `.coordTransform(options)` emits the same normalized spec.
- Identity-only coordinate transforms canonicalize away like cartesian coordinates.
- Axis-local semantic `limits` create a post-stat viewport and do not remove rows or re-run stats; `expand`, coordinate `reverse`, and plot-level `clip` are explicit.
- Scale transforms remain pre-stat. Coordinate transforms consume post-stat scale-space values and do not alter trained semantic scale domains or stat inputs.
- Invalid coordinate domains fail before geometry with a stable problem/cause/fix diagnostic.
- Coordinate inversion is ordered before scale inversion for pixel-to-domain interactions.

## Projector algebra

For each continuous panel axis:

1. Geometry provides post-stat scale-space values through the existing affine scale.
2. The projector reconstructs scale-space values from unprojected panel fractions.
3. It applies the coordinate transform to values and the trained transformed-domain endpoints.
4. It maps the coordinate-space result affinely into the panel extent.
5. For inverse interaction, it performs the inverse affine map, coordinate inverse, then the existing scale inverse.

Band axes allow only identity coordinate transforms. Non-identity transforms on band/time axes fail early rather than guessing numeric category meaning or transforming temporal epoch magnitudes.

## Geometry and topology

- Points/glyphs: project anchors only.
- Rects: project separable edges and remain rectilinear.
- Paths (line/smooth/area/ribbon): adaptive midpoint tessellation in screen space after panel size is known.
- Step paths: preserve authored right-angle topology; project existing axis-aligned segments without inserting diagonal corner smoothing.
- Segments (rules/errorbars): tessellate nonlinear diagonal segments into path batches; axis-aligned segments remain segments.
- Invalid projected values split paths and never bridge discontinuities.
- Tolerance: 0.5 px midpoint error; max depth 12; max 4,096 vertices per subpath and 65,536 per layer/panel. Caps emit one deterministic warning and retain a bounded approximation.
- Synthetic render vertices inherit a source-row reference for paint/focus only, but do not become interaction candidates.
- `PathsBatch` carries semantic anchor positions/row indexes separately from render positions when tessellation changes topology. Candidate construction reads anchors; hit testing reads render segments and resolves to the nearest semantic anchor/source lineage.

## Guides and facets

- Semantic break selection stays unchanged.
- Tick positions and grid lines pass through the coordinate projector.
- Each free-scale facet owns a projector trained from its panel scale.
- Coordinate transforms never swap semantic x/y. Existing coord flip remains a separate coordinate variant in this PR; unsupported transform+flip composition fails by construction rather than introducing an undocumented compound grammar.

## Diagnostics

Add stable codes and recovery text for:

- non-continuous axis with non-identity coordinate transform;
- temporal axis with non-identity coordinate transform;
- transformed endpoint outside the coordinate transform domain;
- tessellation cap exhaustion;
- invalid/discontinuous geometry removed during projection.

Diagnostics are JSON-safe and bounded; no source values beyond existing bounded evidence are added.

## TDD sequence

1. RED: TypeBox/runtime/TypeScript parity and helper/builder normalization.
2. RED: log/sqrt projector forward/inverse and invalid-domain cases.
3. RED: scale-log smooth differs from coord-log smooth while coord-log keeps the identity-scale fit.
4. RED: line/area/ribbon/diagonal segment curvature, step preservation, rect projection, discontinuity splitting, and caps.
5. RED: semantic candidate count/values remain tied to original/stat anchors while path render vertices increase.
6. RED: axis/grid projection, free facets, SVG/canvas parity, interval inversion, brush zoom, SSR.
7. GREEN in the smallest seams: spec → projector → scene topology → candidate store → Svelte inverse adapter.
8. Add docs, migration note, eval, evidence, packed-consumer check, and benchmark.

## Verification and release evidence

- Focused spec/core/Svelte tests for every contract above.
- Full repository check, lint, format, Knip, action security, generated-artifact freshness, package build, SSR, three-browser component matrix, and packed consumer.
- Benchmark identity projector, nonlinear 100k points, and worst-case tessellation/cap behavior.
- `artifacts/scale-equivalence/pr4-coord-transform/` records canonical spec, stage trace, ggplot2 reference, screenshots at 320/640/1200 light/dark, browser verification, performance, dependency delta, and explained parity differences.
- Coordinate guide and scale-vs-coordinate docs include PortableSpec, fluent builder, ggplot2 alias, and Svelte composition.
- Visual baselines are never committed directly; any baseline update follows source-first `vr-approve` publication after merge.

## Stack and shipping

PR 4 branches from merged PR 3 (`main`) and targets `main`. PR 5 branches from PR 4 head and targets the PR 4 branch until PR 4 merges. No external model/API review is run without explicit authorization.
