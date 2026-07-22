# ADR 0019: Keep responsive guide presentation downstream of scale semantics

- Status: accepted
- Date: 2026-07-23

## Context

Authors need to suppress, title, order, orient, and place axes and non-position guides without changing trained domains, transforms, breaks, labels, assignments, or interaction identity. The previous renderer always reserved one fixed legend column on the right and had no portable guide configuration.

## Decision

`PortableSpec` accepts strict `guides` entries and scale-local `guide` entries. Top-level entries win over scale-local entries; legacy legend ordering remains the fallback. Guide variants are bounded JSON objects (`axis`, `legend`, `colorbar`, `colorsteps`, or `none`) and incompatible aesthetic/variant pairs fail validation.

Scale training continues to produce semantic guide plans. A downstream guide resolver applies suppression and appearance. Automatic non-position guides use the right side only above 480 px when at least 320 px of readable panel remains; otherwise they move below. Bottom ramps and steps are horizontal, and bottom discrete guides wrap complete semantic labels deterministically.

Discrete guides merge only when their source field, exact encoded domain identities, labels, title, family semantics, interaction policy, and missing/unknown policy agree. Merged keys retain every represented aesthetic and one exact raw-value interaction target. Numeric ticks and bins remain representative and non-interactive. Identity guides remain hidden unless explicitly forced.

Theme tokens own guide typography, key spacing, block spacing, and ramp dimensions. Per-guide overrides are bounded by the schema. SVG and Svelte render the same scene geometry and accessibility contract.

## Consequences

- Responsive layout can replan after viewport changes without retraining scale assignments.
- Explicit right and bottom guides can occupy both zones in one chart.
- `collision: "error"` produces a structured `guide-layout-overflow` error rather than silently truncating.
- Existing automatic legends may move below on narrow viewports; this is a presentation migration, not a data-semantic change.
- Future guide renderers must consume semantic plans and may not infer or rewrite scale domains.
