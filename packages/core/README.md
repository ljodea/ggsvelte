# @ggsvelte/core

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-core)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fcore)

The framework-agnostic ggsvelte engine: the grammar-of-graphics pipeline
(stats, positions, panel-aware facets, value-stable scales, two-pass layout)
and the pure SVG-string renderer. The main entry has no DOM dependency —
safe in Node, edge runtimes, and workers; canvas rendering and the hit index
live behind `@ggsvelte/core/dom`. The current API remains pre-1.0;
correctness fixes improve defaults in place with documented direct overrides.

```sh
bun add @ggsvelte/core     # or: npm install @ggsvelte/core
```

Most apps want the [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
package instead — Svelte 5 components over this engine. Use `@ggsvelte/core`
directly for server/CLI/agent rendering.

## Quick example

```ts
import { renderToSVGString, runPipeline } from "@ggsvelte/core";

const spec = {
  data: {
    values: [
      { year: "1835", value: 12 },
      { year: "2026", value: 31 },
    ],
  },
  layers: [
    { geom: "line", aes: { x: { field: "year" }, y: { field: "value" } } },
  ],
};

// Headless, deterministic, all-SVG (the export path)
const svg = renderToSVGString(spec, { width: 640, height: 400 });

// Or drive a custom renderer from the full model
const model = runPipeline(spec, { width: 640, height: 400 });
console.log(model.scaleDecisions); // inferred parser, precision, evidence, domain
console.log(model.scaleDiagnostics); // bounded problem/cause/fix advisories
console.log(model.guidePlans); // per-panel intervals, visible/full labels, fit state
model.scene; // panels, axes, legends, geometry batches (typed arrays)
model.advisories; // every heuristic decision, with how-to-override
model.warnings; // degraded-but-rendered conditions
```

Position scales preserve semantic source values while cached `identity`,
`log10`, or `sqrt` views feed statistics and positions exactly once. The final
trained continuous scale exposes both `normalize(semantic)` and
`normalizeTransformed(scaleSpace)`, semantic inversion, family `linear`, and a
separate `transform`. Binned scales retain private integer identities for
count/stack/dodge while guides, candidates, and interactions use semantic
centers and edges.

Non-position color/fill scales resolve ordinal, sequential, binned, manual,
and identity families through one semantic value path. Sequential and binned
families expose semantic and transformed domains; manual/identity preserve
explicit NA and unknown policies. Bounded warnings count fallback use, and
numeric or temporal `labels` formats apply to colorbars and colorsteps.
`guidePlans` includes immutable `discrete`, `colorbar`, and `colorsteps`
payloads, while SVG, canvas, and Svelte consume the same resolved mark colors.

Mapped size, linewidth, alpha, shape, and linetype share stable training,
NA/unknown policy, immutable guide plans, and scene vectors. Size interpolates
in symbol area; shape/linetype use finite named sets and require binning for
quantitative data. Discrete and binned styles contribute to grouping while
continuous numeric styles do not. Candidate hit geometry follows mapped point
radius and stroke width, and candidate semantics retain the resolved styles.

Guide appearance resolves after scale training. Automatic guides use the right zone
only when the viewport remains readable, otherwise they move below with horizontal
ramps and deterministic key wrapping. Explicit right and bottom zones can coexist.
Discrete guides merge only across exact semantic identities and preserve every
represented aesthetic for focus/filter indexing. Identity guides remain suppressed
unless forced; representative numeric ticks and bins remain non-interactive.

`coordTransform` is a separate post-stat projector. Per-panel projectors map
trained scale-space values through identity/log10/sqrt coordinates, project
axis ticks and grids, adaptively tessellate curved paths/segments, and expose
the inverse used before scale inversion. Synthetic tessellation vertices are
render topology only; `CandidateStore` retains original/stat semantic anchors.

Browser rendering:

```ts
import { drawStratum } from "@ggsvelte/core/dom";

// Hit resolution uses the model-owned CandidateStore; no second index build.
const candidate = model.candidates.hitTest(plotX, plotY);
```

Specs are validated via [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
(re-exported errors follow the same `{ code, path, message, fix }` contract).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
