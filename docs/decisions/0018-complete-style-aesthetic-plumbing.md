# ADR 0018: Complete style-aesthetic scale plumbing

- Status: accepted
- Date: 2026-07-21

## Context

`size`, `linewidth`, and `alpha` existed as schema channels or geom constants,
but mapped values did not share the full scale pipeline. `shape` and `linetype`
had no finite portable output contract. This created backend drift, dropped
post-stat values, incorrect grouping, fixed-size hit regions, and legends that
could not explain or interact with style mappings.

## Decision

1. Treat `size`, `linewidth`, `alpha`, `shape`, and `linetype` as first-class
   mapped aesthetics from binding through candidates.
2. Give numeric styles sequential, ordinal, binned, manual, identity, date,
   and datetime authoring families. Interpolate point size in symbol area;
   interpolate linewidth and alpha linearly. Alpha outputs are bounded to
   `[0, 1]`; size and linewidth outputs are positive.
3. Give shape and linetype closed named output sets. They support ordinal,
   binned, manual, and identity families, but never continuous interpolation.
   Quantitative source values require explicit binning.
4. Keep literal constants unscaled. `{ value, scale: true }` opts a constant
   into scale training and lookup.
5. Let discrete and binned style mappings participate in implicit grouping.
   Continuous numeric style mappings do not split groups. Binned styles group
   by trained bin identity rather than each raw source number.
6. Store per-primitive style vectors alongside geometry without reordering
   rows, vertices, subpaths, or lineage. SVG, Svelte SVG, canvas, and SSR read
   the same vectors. Canvas restores alpha, width, and dash state after each
   batch.
7. Publish immutable style guide plans and style-aware scene legends. Legend
   focus/filtering and inspection use semantic source values, while glyphs
   display the resolved output style.
8. Make point radius and stroked-path/segment width part of candidate hit
   geometry. Candidate projections retain resolved size, linewidth, alpha,
   shape, and linetype values.
9. Use bounded diagnostics with concrete recovery for unsupported geom/style
   combinations, finite-palette exhaustion, invalid constants, malformed
   domains/ranges/breaks, temporal parsing, and NA/unknown fallback use.

## Consequences

- PortableSpec remains deterministic JSON; callbacks and regular expressions
  are still forbidden.
- Existing scalar geom params remain valid and keep their rendering fast paths.
- Scene batches gain optional typed style vectors, and public render models gain
  resolved style scales/states/guide plans.
- A style mapping that was previously ignored can now change rendering and
  implicit grouping. This is a correctness fix before 1.0 and is documented in
  the 0.7→0.8 migration rather than hidden behind legacy behavior.
