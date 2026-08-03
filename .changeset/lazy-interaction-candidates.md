---
"@ggsvelte/core": minor
---

# Interaction: lazy candidate store behind a runtime hook (#1421)

The interaction candidate store (hit-testing) no longer ships in the lean
`@ggsvelte/core/render` graph and no longer builds during `runPipeline`:

- Candidate construction runs through a runtime hook
  (`candidate-runtime.ts`, mirroring `temporal-runtime.ts`). The full barrel
  installs it via `install-candidates.ts`; the lean render entry omits it, so
  headless/SSR bundles drop ~95 KB raw of candidate-store/hit/spatial code
  (ggsvelte-svg 156.0 → 136.1 KB gzip, ggsvelte-canvas 148.6 → 128.6 KB gzip,
  measured same-tree).
- `RenderModel.candidates` / `RenderModel.lineage` are now lazy getters that
  build the store once on first access. Full-entry behavior is unchanged;
  a `renderToSVGString` run never pays candidate-build cost at runtime.
- Accessing either on a lean-entry model throws an `Error` naming the full
  entry. `semantic-viewport` resolves the store at interaction time.

CI bundle guard: `benchmarks/competitive/lean-candidates-graph.test.ts`
asserts the lean graphs exclude the candidate-store modules.

Migration: none — additive behavior for `@ggsvelte/core` consumers;
`@ggsvelte/core/render` consumers who read `model.candidates` or
`model.lineage` must switch to the full `@ggsvelte/core` entry.
