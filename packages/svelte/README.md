# ggsvelte

Svelte 5 adapter for the ggsvelte layered grammar of graphics — plus the
whole `@ggsvelte/spec` + `@ggsvelte/core` surface re-exported, and the
`ggsvelte-render` CLI. The v0.1 API is intentionally early (lifecycle tags in the
repo's `lifecycle.json`).

```sh
bun add @ggsvelte/svelte        # or: npm install @ggsvelte/svelte
```

## Quick example — three surfaces, one spec

```svelte
<script>
  import { GGPlot, GeomPoint, gg, aes } from "@ggsvelte/svelte";

  const rows = [
    { displ: 1.8, hwy: 29 },
    { displ: 5.7, hwy: 16 },
  ];

  // 1. Spec JSON (what agents emit)
  const spec = {
    data: { values: rows },
    layers: [
      { geom: "point", aes: { x: { field: "displ" }, y: { field: "hwy" } } },
    ],
  };

  // 2. Fluent builder — same canonical spec
  const built = gg(rows, aes({ x: "displ", y: "hwy" }))
    .geomPoint()
    .spec();
</script>

<!-- 3. Components as sugar -->
<GGPlot data={rows} aes={{ x: "displ", y: "hwy" }} width={640} height={400}>
  <GeomPoint />
</GGPlot>

<GGPlot {spec} width={640} height={400} />
```

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
categorical colors. See the [interaction guide and typed event reference](https://ljodea.github.io/ggsvelte/guide/interactions).

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
- Pre-0.1 interaction migration: <https://ljodea.github.io/ggsvelte/guide/migrating-pre-0-1>
- Spec package: [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
- Core package: [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
- Agent skill: `skills/ggsvelte/SKILL.md` (shipped in this package)

MIT © Liam O'Dea
