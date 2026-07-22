# Scale-defaults equivalence program

The eight-PR program preserves the execution order:

`input typing/parsing → pre-stat scale transform → stats/positions → scale training/breaks/guides → post-stat coordinate transform → rendering/interactions`

|  PR | Capability                                                     | Evidence                                               |
| --: | -------------------------------------------------------------- | ------------------------------------------------------ |
|   1 | Deterministic temporal parsing, inference, source preservation | [`pr1-temporal-semantics/`](pr1-temporal-semantics/)   |
|   2 | Semantic temporal guide plans and measured calendar labels     | [`pr2-temporal-guides/`](pr2-temporal-guides/)         |
|   3 | Pre-stat position transforms and position scale families       | [`pr3-position-transforms/`](pr3-position-transforms/) |
|   4 | Post-stat coordinate projector, inverse, and tessellation      | [`pr4-coord-transform/`](pr4-coord-transform/)         |
|   5 | Generic color/fill scale families and guide payloads           | [`pr5-color-fill/`](pr5-color-fill/)                   |
|   6 | Complete size/linewidth/alpha/shape/linetype plumbing          | [`pr6-style-aesthetics/`](pr6-style-aesthetics/)       |
|   7 | Responsive guide API, layout, rendering, and interactions      | [`pr7-responsive-guides/`](pr7-responsive-guides/)     |
|   8 | Fixed/equal coordinates and integrated release audit           | [`pr8-coord-fixed/`](pr8-coord-fixed/)                 |

## Final audit

- PortableSpec remains strict deterministic JSON. No callback, regular expression, executable formatter, or external model dependency was added.
- Temporal inference remains bounded head/tail evidence followed by whole-column validation; ambiguous DMY/MDY, two-digit years, and year-like identifiers are never guessed silently.
- Scale transforms remain pre-stat. Coordinate transforms and fixed-aspect layout remain post-stat/downstream of scale training.
- Spec helpers, fluent builder, Svelte composition, snake-case aliases, generated schema/declarations, runtime validation, and packed consumers are checked together.
- Every owner includes deterministic tests, migration guidance, diagnostics, eval coverage, R/semantic/browser evidence, and a bounded benchmark.
- Visual smoke baselines may be updated only by the post-merge `vr-approve` workflow.
- External live-model eval is optional only when explicitly authorized and credentialed; deterministic eval regressions are the routine non-zero gate.
