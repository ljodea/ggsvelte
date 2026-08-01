# @ggsvelte/core

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-core)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fcore)

Grammar pipeline (stats, positions, facets, scales, layout) and pure SVG-string
renderer. The main entry has no DOM — Node, edge runtimes, workers. Canvas and
hit-testing live under `@ggsvelte/core/dom`. Pre-1.0.

```sh
bun add @ggsvelte/core     # or: npm install @ggsvelte/core
```

For server, CLI, and agent rendering. Svelte apps use
[`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte).

## Quick example

Author with the builder from `@ggsvelte/spec`, render here:

```ts
import { renderToSVGString, runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

const spec = gg(
  [
    { year: "1835", value: 12 },
    { year: "2026", value: 31 },
  ],
  aes({ x: "year", y: "value" }),
)
  .geomLine()
  .spec();

const svg = renderToSVGString(spec, { width: 640, height: 400 });

const model = runPipeline(spec, { width: 640, height: 400 });
// model.scene, model.scaleDecisions, model.guidePlans,
// model.advisories, model.warnings, model.candidates
```

Bare PortableSpec JSON works the same way — channel mappings use
`{ field: "col" }`, not bare strings:

```ts
import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(
  {
    data: {
      values: [
        { year: "1835", value: 12 },
        { year: "2026", value: 31 },
      ],
    },
    layers: [
      {
        geom: "line",
        aes: { x: { field: "year" }, y: { field: "value" } },
      },
    ],
  },
  { width: 640, height: 400 },
);
```

## Entries

| Import                    | Use                                          |
| ------------------------- | -------------------------------------------- |
| `@ggsvelte/core`          | Full grammar + temporal + SVG string         |
| `@ggsvelte/core/render`   | Lean identity-chart surface (no heavy stats) |
| `@ggsvelte/core/dom`      | Browser canvas draw + hit index              |
| `@ggsvelte/core/temporal` | Temporal polyfill entry                      |

CLI without installing this package as a library:
[`ggsvelte-render`](https://www.npmjs.com/package/@ggsvelte/cli) (same pipeline,
JSONL diagnostics on stderr).

Specs validate through
[`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec).
Docs: [ggsvelte.sh](https://ggsvelte.sh/) · Repo:
[github.com/ljodea/ggsvelte](https://github.com/ljodea/ggsvelte)

[MIT](https://github.com/ljodea/ggsvelte/blob/main/LICENSE) © Liam O'Dea
