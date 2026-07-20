# PR 1 clean-room temporal journey

Measured: 2026-07-19

## Journey

1. `npm install` the three packed v0.3.0 packages in a new strict-TypeScript Svelte 5.33.1 app.
2. Paste three raw rows (`"1835"`, `"1900"`, `"2026"`) and `<GGPlot ...><GeomLine /></GGPlot>` from the package README.
3. Run `svelte-check`, client build, SSR build, pure SVG render, and installed CLI smoke.

## Result

- Install: 14 seconds on the local runner.
- Author actions after install: paste one complete example and run the existing check/build command.
- Strict type check: 0 errors and 0 warnings.
- Client and SSR builds: pass.
- Headless raw-year render: pass with calendar-year labels.
- Estimated first-human-success path from package search to visible chart: under 5 minutes; no preprocessing or scale configuration step.

The automated clean-consumer gate is `bun run compat:consumer`; its fixture includes raw-year Svelte authoring, runtime `Date` authoring, fluent/alias exports, PortableSpec validation, SSR, client build, pure render, and CLI execution.
