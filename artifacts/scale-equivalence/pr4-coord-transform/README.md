# PR 4 — post-stat coordinate transform evidence

This directory records evidence for `coordTransform`/`coord_transform`: post-stat coordinate algebra, adaptive curved topology, semantic anchors, and coordinate-before-scale interaction inversion.

## Contract fixture

- [`canonical-spec.json`](./canonical-spec.json) is the strict PortableSpec rendered by the public Playground sample.
- The same journey is documented through fluent builder and direct Svelte composition in the Facets and coordinates guide.
- Its `geomSmooth(method: "lm")` consumes ordinary exposure values. The x-axis log10 coordinate is applied only after the fit and therefore bends the fitted line. `examples/point/log-scale` is the intentional pre-stat scale-transform counterpart.

## Stage trace

```text
source exposure
  → identity scale-space view
  → lm fit + point positions
  → continuous scale training + semantic breaks
  → coord log10 forward
  → 0.5 px adaptive path tessellation
  → SVG/canvas render topology

pointer/brush pixels
  → coord log10 inverse
  → scale inverse
  → semantic exposure/source row
```

Synthetic tessellation vertices carry paint lineage only. `CandidateStore.size`, tooltip values, selection lineage, and keyboard traversal remain tied to original/stat anchors.

## Automated evidence

- `packages/spec/tests/coord-transform-api.test.ts`: TypeBox/runtime/helper/builder/alias parity and strict negative fixtures.
- `packages/core/tests/coord-transform.test.ts`: projector algebra, composition, invalid domains, and segment topology.
- `packages/core/tests/pipeline-coord-transform.test.ts`: stage distinction, ticks/grids, limits, clipping, step/rect/path topology, candidates, and hit testing.
- `packages/svelte/tests/zoom/zoom.test.ts`: coordinate inverse before scale inverse.
- `tests/evals/cases/50-post-stat-coordinate-transform.json`: deterministic agent contract.
- `scripts/consumer-compat.ts`: packed spec/Svelte helper and render contract.

## Browser evidence

`browser-verification.json` records the tested route, viewport matrix, console state, semantic assertions, and screenshot names. Screenshots in this directory are ordinary source evidence, not Playwright visual baselines. Files under `tests/visual/__screenshots__/` are never edited by this PR.

## Performance and bounds

`performance.json` records the identity/reverse 100k point projector, log10 100k point projector, and cap-exhausting 10k path tessellation workloads. Runtime refinement uses depth 12 and caps adaptive output at the greater of mandatory semantic anchors and 4,096 vertices per subpath / 65,536 vertices per layer-panel. Cap exhaustion emits `coord-tessellation-cap`; authored/stat anchors are never truncated.

No runtime dependency was added; see `dependency-size.json`.

## Reference and intentional differences

`ggplot2-reference.R` renders the corresponding `coord_transform(x = "log10")` fit. Exact anti-aliasing, fonts, and default margins may differ. Required semantic parity is stage order, finite projected geometry, curved topology, semantic tick/interaction values, and a fit distinct from `scale_x_log10()`.
