# PR 6: Complete aesthetic plumbing

Base: merged PR 5 (`main`)
Branch: `feat/complete-aesthetic-plumbing`

## Outcome

Make every advertised mapped style channel truthful. `size`, `linewidth`, and `alpha` must visibly affect compatible marks. Add finite `shape` and `linetype` scale families with stable assignment, semantic guides, renderer parity, interaction-correct hit regions, and corrective diagnostics for unsupported families.

## Invariants

- Preserve the canonical stage order: parse/input typing → pre-stat position transforms → stats/positions → non-position training/guides → post-stat coordinates → rendering/interactions.
- PortableSpec stays deterministic JSON. No callbacks or regex values.
- Unmapped aesthetics retain scalar fast paths. Mapped numeric styles use typed per-primitive vectors.
- Shape and linetype use finite, named, interned tables. Exhaustion never silently recycles.
- Discrete mapped styles participate in default grouping. Continuous mapped numeric styles do not.
- Geometry, SVG, canvas, Svelte, SSR, candidates, and hit testing consume the same resolved styles.
- Source values remain candidate/interaction truth; mapped presentation values do not replace datum values.

## Capability contract

| Aesthetic |                       Continuous | Discrete | Binned | Date/datetime | Manual | Identity | Compatible geoms                      |
| --------- | -------------------------------: | -------: | -----: | ------------: | -----: | -------: | ------------------------------------- |
| size      |                              yes |      yes |    yes |           yes |    yes |      yes | point, text                           |
| linewidth |                              yes |      yes |    yes |           yes |    yes |      yes | line, smooth, rule, errorbar, boxplot |
| alpha     |                              yes |      yes |    yes |           yes |    yes |      yes | all mark geoms                        |
| shape     | no; corrective binned diagnostic |      yes |    yes |            no |    yes |      yes | point                                 |
| linetype  | no; corrective binned diagnostic |      yes |    yes |            no |    yes |      yes | line, smooth, rule, errorbar, boxplot |

## Implementation tasks

1. Add one checked capability table that drives schema claims, helper/API ledgers, runtime compatibility, grouping, and generated docs.
2. Add strict TypeBox/TypeScript scale contracts for numeric and finite-symbol styles, including bounded ranges/domains and forbidden family-specific options.
3. Add camelCase, ggplot2 snake_case, builder, and Svelte-root exports with normalized-output identity tests.
4. Bind mapped/literal/scaled-constant style channels and carry their source/stat values through every `LayerFrame` path.
5. Train numeric and finite-symbol scales with stable `ScaleState`, explicit NA/unknown/OOB/exhaustion policy, and deterministic diagnostics.
6. Publish immutable JSON-only style GuidePlans. Keep PR 7 responsible for responsive merge/layout controls.
7. Add scalar-or-vector batch styles; shape and dash indexes reference canonical interned tables.
8. Render identical per-primitive styles in pure SVG, Svelte SVG, and canvas. Canvas must reset alpha/dash/width state after runs.
9. Make candidate hit regions use mapped point radius and stroke width, with conservative finite-shape bounds.
10. Add grouping tests proving only discrete mapped styles split stats.
11. Add docs, migration notes, monochrome example, eval, benchmark, R/ggplot2 reference, browser evidence, changeset, and packed-consumer coverage.

## TDD order

1. Capability/schema/helper tests fail.
2. Binding/frame/training tests fail.
3. Geometry batch vector tests fail.
4. SVG/canvas/Svelte/SSR parity tests fail.
5. Candidate hit and grouping tests fail.
6. Guide, docs, eval, benchmark, consumer, and browser gates fail before their implementation.

## Verification

Run focused tests after each red/green unit, then the project’s complete spec/core/script/eval, Svelte browser/SSR, docs/build, formatting/lint/type, generated-artifact, package, packed-consumer, benchmark, eval, and browser evidence gates. Do not commit visual-regression baselines directly.
