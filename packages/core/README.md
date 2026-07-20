# @ggsvelte/core

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-core)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fcore)

The framework-agnostic ggsvelte engine: the grammar-of-graphics pipeline
(stats, positions, panel-aware facets, value-stable scales, two-pass layout)
and the pure SVG-string renderer. The main entry has no DOM dependency —
safe in Node, edge runtimes, and workers; canvas rendering and the hit index
live behind `@ggsvelte/core/dom`. The current v0.3.0 API remains pre-1.0;
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
model.scene; // panels, axes, legends, geometry batches (typed arrays)
model.advisories; // every heuristic decision, with how-to-override
model.warnings; // degraded-but-rendered conditions
```

Browser rendering:

```ts
import { drawStratum } from "@ggsvelte/core/dom";

// Hit resolution uses the model-owned CandidateStore; no second index build.
const candidate = model.candidates.hitTest(plotX, plotY);
```

Specs are validated via [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
(re-exported errors follow the same `{ code, path, message, fix }` contract).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
