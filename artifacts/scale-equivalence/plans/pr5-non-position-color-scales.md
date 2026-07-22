# PR 5 plan: generic non-position color/fill scales

Status: implementation approved by the user on 2026-07-21
Base: merged PR 4 on `main`
Branch: `feat/non-position-color-scales`

## Goal

Complete color/fill translation and semantic guide payloads on one reusable non-position scale contract. Preserve the pipeline order established by PRs 1–4 and keep PortableSpec strict, deterministic, JSON-only.

## Public contract

Color and fill receive binding-identical camelCase, `color`/`colour`, and ggplot2 snake-case families:

- continuous, discrete, binned, log10, sqrt, date, datetime, manual, identity;
- builder methods for the camelCase families;
- helpers normalize to canonical PortableSpec and match hand-authored JSON exactly.

The canonical color scale engine supports ordinal, sequential, binned, manual, and identity families. Continuous/date/datetime/log10/sqrt helpers configure the sequential family with the matching transform or temporal intent. Explicit domain/range/breaks/reverse/OOB/NA/unknown policies outrank defaults.

## Runtime design

1. Collect source-backed semantic color/fill values without changing source rows.
2. Resolve one family per aesthetic from explicit configuration, named scheme, or bounded data evidence.
3. Sequential and binned numeric scales apply identity/log10/sqrt before domain training; temporal scales reuse the canonical parser registry and epoch representation.
4. Manual scales pair domain values with range colors and never recycle unknown values.
5. Identity scales validate and forward source color values; invalid/NA values use explicit fallback policy.
6. Binned scales compute deterministic transformed boundaries, classify intervals as `[lower, upper)` with the final interval closed, and never leak internal bin IDs.
7. Existing ordinal assignment state remains value-stable across filters and renders.
8. Geometry, SVG, canvas, SSR, candidates, and interactions consume the same resolved colors.

## Guide payloads

Extend core `GuidePlan` with immutable, serializable non-position plans:

- `discrete`: ordered values, labels, swatches, semantic domain, NA/unknown policy;
- `colorbar`: semantic domain, transform, direction, reference ticks, labels, ramp stops, temporal context, NA treatment;
- `colorsteps`: ordered interval boundaries, inclusivity, labels, swatches, transform, temporal context, NA/unknown treatment.

Scene legends render discrete, colorbar, and colorsteps payloads. PR 5 ships automatic payload selection and rendering; PR 7 owns public responsive guide appearance, merge, placement, and author-control APIs.

## Diagnostics and limits

- Reject family/scheme contradictions and malformed manual mappings before execution.
- Reject non-identity transforms for temporal color scales.
- Report invalid transform domains and all-invalid mappings with problem/cause/fix diagnostics.
- Bound binned color/fill scales to 64 bins and explicit arrays to 65 boundaries.
- Emit bounded warnings for censored, NA, unknown, and palette-exhaustion events.
- Never execute callbacks, regex supplied by authors, `eval`, or `new Function`.

## TDD order

1. Add failing spec/API tests for TypeBox/runtime/TypeScript parity, helpers, aliases, builder output, normalization, and invalid combinations.
2. Add failing core tests for family inference, transforms, binned boundaries, manual/identity policies, state stability, and immutable GuidePlans.
3. Add failing SVG/canvas/Svelte/SSR tests for colorbar and colorsteps parity.
4. Implement schema, helpers, capabilities, normalization, and validation.
5. Implement generic runtime families and guide plans.
6. Implement scene/SVG/Svelte colorsteps rendering and semantic narration.
7. Add docs, migration note, ADR, examples, deterministic eval, benchmark, packed-consumer checks, and R/browser evidence.
8. Run focused tests, full core/spec tests, full Svelte browser and SSR matrices, builds/checks/lint/Knip/security/docs/generated artifacts, packed consumer, benchmarks, and pre-push hooks.

## Ownership and deferrals

This PR owns color/fill families and their payloads. PR 6 owns size/linewidth/alpha repair and shape/linetype plumbing. PR 7 owns public responsive guide authoring and presentation. PR 8 owns `coord_fixed` and the integrated release/evidence audit.
