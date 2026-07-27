# @ggsvelte/core

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-core)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fcore)

Grammar pipeline (stats, positions, facets, scales, layout) and pure SVG-string
renderer. Main entry has no DOM — Node, edge runtimes, workers. Canvas and hit
index live under `@ggsvelte/core/dom`. Pre-1.0.

```sh
bun add @ggsvelte/core     # or: npm install @ggsvelte/core
```

For server, CLI, and agent rendering. Svelte apps use
[`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte).

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

const svg = renderToSVGString(spec, { width: 640, height: 400 });

const model = runPipeline(spec, { width: 640, height: 400 });
// model.scene, model.scaleDecisions, model.guidePlans,
// model.advisories, model.warnings
```

Browser canvas + hit testing:

```ts
import { drawStratum } from "@ggsvelte/core/dom";

const candidate = model.candidates.hitTest(plotX, plotY);
```

## Contract

- **Scale transforms** run before statistics; **coord transforms** project after
  statistics and invert before scale inversion for interactions.
- Position scales keep semantic source values; cached `identity` / `log10` /
  `sqrt` views feed stats and positions once.
- Non-position color/fill and style channels share one training path; SVG,
  canvas, and Svelte consume the same resolved mark styles.
- Auto non-position guides sit on the right while the panel stays readable,
  else move below. Identity guides stay suppressed unless forced.
- `coordFixed({ ratio })` fits a centered data rectangle with exact physical
  unit ratios after chrome allocation; free positional facet scales fail with
  `coord-fixed-free-scales`.

Specs validate through
[`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
(re-exported errors keep the `{ code, path, message, fix }` shape).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
