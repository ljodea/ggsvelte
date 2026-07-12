# ggsvelte

Svelte 5 adapter for the ggsvelte layered grammar of graphics — plus the
whole `@ggsvelte/spec` + `@ggsvelte/core` surface re-exported, and the
`ggsvelte-render` CLI. Pre-0.1.0, explicitly unstable (lifecycle tags in the
repo's `lifecycle.json`).

```sh
bun add ggsvelte        # or: npm install ggsvelte
```

## Quick example — three surfaces, one spec

```svelte
<script>
  import { GGPlot, GeomPoint, gg, aes } from "ggsvelte";

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

`<GGPlot>` supports `facet`, `coord`, `theme`, `tooltip`, `brush`/`zoom`,
`width="container"`, per-layer `render="canvas"`, and `a11y="force-svg"`.

## Headless + CLI

```ts
import { renderToSVGString } from "ggsvelte";
const svg = renderToSVGString(spec, { width: 640, height: 400 });
```

```sh
ggsvelte-render spec.json --width 640 --height 400 > chart.svg
```

## Links

- Repo + docs: <https://github.com/ljodea/ggsvelte>
- Spec package: [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec)
- Core package: [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
- Agent skill: `skills/ggsvelte/SKILL.md` (shipped in this package)

MIT © Liam O'Dea
