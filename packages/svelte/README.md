# ggsvelte

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-svelte)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fsvelte)

Svelte 5 adapter for the ggsvelte layered grammar of graphics — plus the
whole `@ggsvelte/spec` + `@ggsvelte/core` surface re-exported, and the
`ggsvelte-render` CLI. Current releases remain pre-1.0; correctness
fixes improve defaults in place and are documented with direct overrides (lifecycle
tags live in the repo's `lifecycle.json`).

```sh
bun add @ggsvelte/svelte        # or: npm install @ggsvelte/svelte
```

## Quick example — three surfaces, one spec

```svelte
<script lang="ts">
  import { GGPlot, GeomLine, gg, aes } from "@ggsvelte/svelte";

  // Untouched year strings infer a proportional calendar axis.
  const rows = [
    { year: "1835", value: 12 },
    { year: "1900", value: 19 },
    { year: "2026", value: 31 },
  ];

  // 1. Spec JSON (what agents emit)
  const spec = {
    data: { values: rows },
    layers: [
      { geom: "line", aes: { x: { field: "year" }, y: { field: "value" } } },
    ],
  };

  // 2. Fluent builder — same canonical spec
  const built = gg(rows, aes({ x: "year", y: "value" }))
    .geomLine()
    .spec();
</script>

<!-- 3. Components as sugar -->
<GGPlot
  data={rows}
  aes={{ x: "year", y: "value" }}
  width="container"
  height={400}
>
  <GeomLine />
</GGPlot>

<GGPlot {spec} width={640} height={400} />
```

ISO dates, year-months, year-quarters, and runtime `Date` values also infer temporal.
For ambiguous values, choose a closed parser with
`.scaleXDate({ parse: "dmy" })` or `scales={{ x: { type: "time", parse: "dmy" } }}`.
Use `.scaleXDiscrete()` / `type: "band"` when four-digit values are identifiers.
`onrender` exposes `model.scaleDecisions`, `model.scaleDiagnostics`, and measured
`model.guidePlans`. Configure calendar labels directly with
`.scaleXDatetime({ dateBreaks: "2 weeks", dateMinorBreaks: "1 day", dateLabels: "%e %b", locale: "en-GB", timezone: "Europe/London" })`.

Numeric `log10` and `sqrt` position transforms run before smooth/bin/density
and other statistics. Use `scaleXLog10()`, `scaleYSqrt()`, `scaleXBinned()`, or
portable `scales={{ x: { type: "linear", transform: "log10" } }}`. Trained
models, GuidePlans, interval selection, and precise bounds report family
`linear` plus `transform`—never trained type `log`. Pinned domains censor
before stats by default; see the upgrading guide for migration and the zero
expansion override.

`<GGPlot>` supports `facet`, `coord`, `theme`, opt-in `inspect`, point or
faceted interval `select`, brush `zoom`, visual `legendFocus`, data-changing
`legendFilter`, `width="container"`, per-layer `render="canvas"`, and
`a11y="force-svg"`.

```svelte
<GGPlot
  data={rows}
  aes={{ x: "date", y: "value", color: "series" }}
  key="id"
  inspect={{ mode: "x" }}
  select={{ type: "interval", mode: "xy", preset: "cross-panel" }}
  legendFilter
  oninteraction={(event) => console.log(event)}
>
  <GeomPoint />
</GGPlot>
```

Inspection includes the HTML tooltip, semantic crosshair, keyboard traversal,
and pinning. Selection and zoom use separate accessible tools and expose exact
labelled bounds entry after a commit. Legend focus only emphasizes groups;
legend filtering reruns the grammar over included rows while preserving stable
categorical colors. Filter changes, clause removals, and clears are delivered to both
`onlegendfilter` and the unified `oninteraction` callback. Changing filter
mode clears prior clauses; values removed from a changing data catalog are
pruned and return visible by default. `resetScales()` resets trained scale
state without clearing active filters. See the [interaction guide and typed event reference](https://ljodea.github.io/ggsvelte/guide/interactions).

## Headless + CLI

```ts
import { renderToSVGString } from "@ggsvelte/svelte";
const svg = renderToSVGString(spec, { width: 640, height: 400 });
```

```sh
ggsvelte-render spec.json --width 640 --height 400 > chart.svg
```

## Links

- Docs + examples: <https://ljodea.github.io/ggsvelte/>
- Repository: <https://github.com/ljodea/ggsvelte>
- Upgrading between releases: <https://ljodea.github.io/ggsvelte/guide/upgrading>
- Pre-0.1 interaction migration: <https://ljodea.github.io/ggsvelte/guide/migrating-pre-0-1>
- Spec package: [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
- Core package: [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
- Agent skill: `skills/ggsvelte/SKILL.md` (shipped in this package)

MIT © Liam O'Dea
