# 0017: Generic non-position color/fill scales

- Status: Accepted
- Date: 2026-07-21

## Context

Color and fill previously had separate ordinal and sequential training paths,
limited options, and renderer-only legend inputs. They could not express
binned, transformed, explicit manual, or identity mappings as strict portable
specs. Continuous legend closures also were not a serializable semantic
contract like the axis GuidePlans introduced in decision 0014.

## Decision

Color and fill share one non-position family contract with canonical
`ordinal`, `sequential`, `binned`, `manual`, and `identity` families.
Continuous, log10, sqrt, date, and datetime authoring helpers configure the
sequential family; binned helpers configure deterministic transformed-space
boundaries. All helper, builder, Svelte, color/colour, and snake-case surfaces
normalize to the same PortableSpec.

Sequential and binned values retain semantic source domains while training and
classifying in identity/log10/sqrt space. Temporal values reuse the canonical
parser registry and epoch representation. Manual scales pair domain and range
positionally without recycling; identity scales validate source hex colors.
Missing and unknown colors are separate explicit policies.

`GuidePlan` is extended with immutable JSON-like `discrete`, `colorbar`, and
`colorsteps` payloads. Renderer layout still consumes a private measured legend
input; public responsive guide appearance and merge controls remain PR 7.
Colorsteps use `[lower, upper)` intervals with a closed final upper boundary and
a maximum of 64 bins.

## Consequences

- SVG, canvas, SSR, and Svelte consume the same resolved colors and semantic
  guide facts.
- Existing `ordinal` and `sequential` JSON remains canonical.
- Code reading `RenderModel.guidePlans` must narrow by `plan.type` before using
  axis-only fields.
- Explicit continuous domains censor by default; authors opt into squishing.
- Manual domain/range mismatches, invalid transform domains, ambiguous temporal
  parsing, and malformed binned boundaries fail with stable diagnostics.
- PR 6 can add size/linewidth/alpha/shape/linetype over the same family shape;
  PR 7 owns public guide presentation and responsive authoring.
