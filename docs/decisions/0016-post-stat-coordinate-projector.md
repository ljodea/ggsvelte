# 0016 — Post-stat coordinate projector and semantic anchors

- Status: accepted
- Date: 2026-07-21

## Context

Decision 0015 moved position scale transforms before statistics. Treating a coordinate transform as another spelling of that operation would produce the wrong smooths, bins, summaries, and interaction inversion. Nonlinear coordinate transforms also bend paths: projecting only authored endpoints draws the wrong topology. Existing path render vertices doubled as interaction candidates, so naïve tessellation would invent inspectable data.

## Decision

`coord_transform` is a distinct post-stat stage:

```text
semantic input → pre-stat scale transform → stats/positions → scale training/guides
               → coordinate forward + bounded tessellation → renderers

pixel inverse → coordinate inverse → scale inverse → semantic/source value
```

Each panel receives independent x/y coordinate projectors. Projectors consume post-stat scale-space values reconstructed from the trained scale affine mapping. Explicit coordinate limits are semantic viewport limits and never filter rows or re-run statistics. Non-identity transforms reject band and temporal axes.

`RenderModel.viewport` is the interaction boundary for this algebra. Its
panel-local interface owns pixel inversion, semantic projection, encoded band
identity resolution, panel lookup, and axis-aware candidate queries. Adapters
must consume that interface instead of recombining scene bounds, trained
scales, coordinate projectors, and flip state.

Adaptive tessellation measures transformed midpoint error in panel pixels. It uses a 0.5 px tolerance and depth 12. Synthetic refinement is limited so output never exceeds the greater of the mandatory semantic-vertex count and 4,096 vertices per subpath / 65,536 vertices per layer-panel. Hitting a cap emits a deterministic warning while retaining every authored/stat semantic anchor.

Path batches distinguish render topology from semantic anchors with a compact mask and original primitive indexes. Generated vertices paint and participate in curved hit geometry but do not enter `CandidateStore`. Segment batches likewise retain one semantic midpoint per source segment while optionally carrying tessellated render paths.

Panel clipping defaults on and can be explicitly disabled. Axes and grids use the same projector as marks. Scale semantic domains, GuidePlan values, tooltip values, and source lineage remain unchanged.

## Consequences

- Scale-log and coord-log fits intentionally differ.
- Coordinate limits provide a non-re-stat viewport while existing scale/brush limits retain their re-stat semantics.
- SVG, canvas, Svelte, hit testing, interval selection, and brush zoom share one coordinate algebra.
- Facet-local interaction remains stable because viewport panels bind their
  own trained scales and coordinate projectors once during model assembly.
- Scene batches gain internal topology metadata; this remains non-contractual pre-1.0 renderer plumbing.
- `coord_transform` cannot compose with `coord_flip` in one PortableSpec yet; the closed coordinate union rejects ambiguous multiple-coordinate composition rather than inventing order.
