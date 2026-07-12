# @ggsvelte/core

The framework-agnostic ggsvelte engine: the grammar-of-graphics pipeline
(stats, positions, panel-aware facets, value-stable scales, two-pass layout)
and the pure SVG-string renderer. The main entry has no DOM dependency —
safe in Node, edge runtimes, and workers; canvas rendering and the hit index
live behind `@ggsvelte/core/dom`. Pre-0.1.0, explicitly unstable.

```sh
bun add @ggsvelte/core     # or: npm install @ggsvelte/core
```

Most apps want the [`ggsvelte`](https://www.npmjs.com/package/ggsvelte)
package instead — Svelte 5 components over this engine. Use `@ggsvelte/core`
directly for server/CLI/agent rendering.

## Quick example

```ts
import { renderToSVGString, runPipeline } from "@ggsvelte/core";

const spec = {
  data: {
    values: [
      { displ: 1.8, hwy: 29 },
      { displ: 5.7, hwy: 16 },
    ],
  },
  layers: [
    { geom: "point", aes: { x: { field: "displ" }, y: { field: "hwy" } } },
  ],
};

// Headless, deterministic, all-SVG (the export path)
const svg = renderToSVGString(spec, { width: 640, height: 400 });

// Or drive a custom renderer from the full model
const model = runPipeline(spec, { width: 640, height: 400 });
model.scene; // panels, axes, legends, geometry batches (typed arrays)
model.advisories; // every heuristic decision, with how-to-override
model.warnings; // degraded-but-rendered conditions
```

Browser half:

```ts
import { buildHitIndex, drawStratum } from "@ggsvelte/core/dom";
```

Specs are validated via [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
(re-exported errors follow the same `{ code, path, message, fix }` contract).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
