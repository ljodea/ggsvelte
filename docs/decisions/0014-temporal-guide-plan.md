# Decision 0014: measured temporal GuidePlans inside two-pass layout

**Status:** Accepted

**Date:** 2026-07-20

## Context

PR #336 made temporal meaning and epoch values correct, but the layout still chose ticks from a fixed pixels-per-tick target. That could produce labels that were calendar-correct yet physically unreadable. Axes also exposed only pixel labels, leaving renderers, interactions, diagnostics, and future guide APIs without one semantic plan.

## Decision

Every drawn axis now has an immutable `AxisGuidePlan`. Temporal plans carry semantic epoch values, visible contextual labels, complete standalone labels, major/minor tier, interval source, locale/timezone, fit state, and stable panel identity. Numeric and band axes adapt their existing ticks into the same axis-first contract. Future legend/colorbar work extends the `GuidePlan` union without changing axis semantics.

Temporal planning runs inside the existing two layout passes:

```text
Pass A provisional extent
  → score bounded calendar candidates
  → selected interval + coarseness ladder + measured margins
Pass B final extent
  → retain Pass-A interval when it fits
  → otherwise walk coarser-only inside this pass
  → final plan and margins; never a third pass
```

Pass B never selects a finer interval. If every bounded candidate overlaps, the coarsest plan renders with a diagnostic. Temporal labels bypass generic post-plan thinning and ellipsis. Margins stay capped; authored text remains intact and reports neighbor overlap or margin overflow separately.

Automatic interval candidates use civil boundaries. Pass A scores the deterministic primary ladder whose approximate count is at most twelve, then walks every coarser candidate if that ladder still overlaps; candidates denser than twelve cannot win the documented 3–7-label preference and are excluded to keep 100-facet planning bounded. Pass B starts at the prior interval and walks only coarser. Date-kind axes remain UTC calendar values. Datetime axes step and format in their explicit IANA timezone. Synthetic tick boundaries use Temporal's `compatible` gap/fold resolution so generation remains monotonic; the author's `disambiguation` policy has already been enforced while parsing source and authored values. The existing native-first Temporal/polyfill adapter and deterministic formatter foundation are reused; adding d3-time would duplicate parser/timezone policy and dependency cost.

Faceted layout retains each panel's Pass-B interval from the shared-margin pass and supplies it as the same-or-coarser hint to final placement. Fixed and free panels therefore cannot re-score to a finer interval after shared margins are known.

Explicit minor breaks project into separate `minorX`/`minorY` grid arrays and minor `SceneTick`s. Fixed subordinate opacity and half-length are defaults, not a public guide-appearance API; PR 7 owns that API.

Under coord flip, `Scene.axes` remains display-bottom/display-left for renderer compatibility. `GuidePlan.aesthetic` remains semantic x/y. Flip supplies display orientation and extent to collision measurement; reverse changes pixel projection, never semantic tick order.

## Diagnostics

New semantic states use stable `temporal-*` codes:

- `temporal-label-overlap`
- `temporal-label-margin-overflow`
- `temporal-break-limit`
- `temporal-break-progression`
- `temporal-break-outside-domain`

Legacy `x:thin`, `x:truncate`, `y:thin`, and `y:truncate` remain non-temporal layout degradations.

## Consequences

- SSR, SVG-string, Svelte SVG, and canvas-backed plots consume the same semantic axis plan.
- Major SVG ticks expose complete labels through a first-child `<title>` even when visible labels omit repeated context.
- Explicit intervals and labels are portable JSON and never callbacks.
- Candidate generation and emitted ticks are hard-capped; fixed-facet computations may be reused only within one render and one measurer identity.
- Visual baseline publication still follows source-first `vr-approve`; no screenshot baseline is committed with source.
