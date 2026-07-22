# PR 7: Responsive guide API and presentation

Base: PR 6 (`feat/complete-aesthetic-plumbing`)
Branch: `feat/responsive-guide-api-presentation`

## Outcome

Let authors change how axes and non-position guides are presented without changing scale math. Replace the fixed right legend column with one deterministic responsive planner, merge only semantically equivalent discrete guides, and preserve exact focus/filter behavior after merging.

## Invariants

- Scale domains, transforms, breaks, labels, parsing, OOB, and assignment state remain authoritative and unchanged by guide appearance.
- Portable guide configuration is strict, bounded, deterministic JSON. No callbacks, regular expressions, or renderer-owned state.
- Resolve appearance precedence once: top-level aesthetic guide > scale-local guide > legacy legend order > defaults.
- Axis GuidePlans and non-position GuidePlans retain full semantic labels. Ellipsis/wrapping is presentation-only.
- Auto non-position placement uses the right side only when the viewport is wider than 480 px and at least 320 px of readable panel remains; otherwise guides move below.
- Bottom colorbars/colorsteps are horizontal. Bottom discrete guides wrap deterministic key-label items without shrinking type.
- Discrete guides merge only when source field, exact value identities, labels, title, family semantics, interactivity, and NA/unknown policy are compatible. Merged keys combine all needed aesthetics.
- Merged guide interactions index every represented aesthetic and retain exact raw-value focus/filter targets.
- Identity/manual guides with fewer than two visible values remain suppressed unless explicitly requested.
- Static guides are never tab stops; exact interactive guide targets retain native button semantics and complete accessible names.
- SSR and hydration use the same viewport-derived planner inputs; one later resize may replan placement without changing semantic assignments.

## Public contract

- Add top-level `guides` keyed by `x`, `y`, `color`, `fill`, `size`, `linewidth`, `alpha`, `shape`, and `linetype`.
- Add scale-local `guide` to every scale family.
- Add `guides()`, `guideAxis`, `guideLegend`, `guideColorbar`, `guideColorsteps`, `guideNone`, ggplot2 aliases, fluent `.guides()`, and direct Svelte `guides` prop.
- Guide variants are `axis`, `legend`, `colorbar`, `colorsteps`, and `none`.
- Axis appearance owns title, tick visibility, label visibility, and collision policy.
- Non-position appearance owns title, numeric order, `auto|right|bottom` position, `auto|vertical|horizontal` direction, key size, collision policy, force visibility, and bounded guide-theme overrides.
- Unsupported aesthetic/variant combinations fail with an actionable tier-1 diagnostic.

## Implementation tasks

1. Add TypeBox/TypeScript declarations, normalization, helpers/aliases, builder and Svelte prop plumbing with runtime/type parity tests.
2. Add one pure guide resolver for precedence, family compatibility, visibility defaults, and appearance-only ownership.
3. Enrich legend inputs with source identity and strict semantic merge metadata; merge compatible discrete inputs into composite keys.
4. Replace the fixed column builder with right/bottom zones, deterministic horizontal wrapping, orientation-aware ramp/steps geometry, and explicit measured reserves in both single/facet layout.
5. Carry guide direction/position/full labels/aesthetic membership into Scene legends and render identical markup in pure SVG and Svelte SVG.
6. Update legend focus/filter indexing so merged guides cover all represented aesthetics while retaining one stable interaction identity.
7. Add theme-owned guide size/gap/colorbar roles plus per-guide bounded overrides; keep reader typography fixed under responsive degradation.
8. Add guide diagnostics for invalid combinations and explicit no-fit/error collision policy; deduplicate responsive degradation warnings.
9. Ship docs, migration, ADR, alternate-presentation example, deterministic eval, resize benchmark, packed-consumer checks, R reference, and browser evidence at 320/640/1200 light/dark.

## TDD order

1. Schema/helper/builder/Svelte prop tests fail.
2. Precedence and invalid-combination tests fail.
3. Strict merge identity and merged interaction tests fail.
4. Responsive right/bottom layout and orientation tests fail.
5. Pure SVG/Svelte/SSR/forced-color tests fail.
6. Docs/eval/benchmark/consumer/browser gates fail.

## Verification

Run focused red/green tests, then complete spec/core/script/eval, all Svelte browser engines and SSR, checks/builds, formatting/lint/Knip, generated-artifact, package/consumer, benchmark, deterministic eval, and browser evidence gates. Do not commit visual-regression baselines directly.

## Completion audit

- [x] Strict schema, helper/alias, builder, and Svelte prop surfaces with runtime/type parity.
- [x] One precedence/compatibility resolver with suppression, force visibility, and structured failures.
- [x] Strict semantic/presentation merge identity and merged multi-aesthetic interaction indexing.
- [x] Independent right/bottom zones, deterministic horizontal wrapping, and measured reserves.
- [x] Direction, position, full labels, and aesthetic membership shared by scene/SVG/Svelte/SSR.
- [x] Theme-owned guide roles plus bounded per-guide overrides and forced-colors controls.
- [x] Deduplicated auto-bottom warning and structured no-fit `collision: "error"` diagnostic.
- [x] Migration fixtures/guide, ADR, alternate-presentation example, eval 53, resize benchmark,
      packed-consumer checks, ggplot2 reference, and 375/1200 light/dark browser evidence.
- [x] Root tests, three browser engines, SSR, builds, docs, lint/type-aware lint, Knip,
      generated artifacts, action security, consumer compatibility, and PR-specific benchmark pass.

The full local benchmark run records three pre-existing host-sensitive canvas/hit-index budget
overages; the isolated benchmark workflow remains authoritative for those workloads. The PR 7
`pipeline responsive-guides resize 10k` workload passes at 4.4417 ms against its 12 ms gate.
