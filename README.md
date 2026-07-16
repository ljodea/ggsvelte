# ggsvelte

A layered grammar of graphics for JavaScript — ggplot2 semantics (aes, geom,
stat, scale, coord, facet, theme, position), a strictly-JSON spec at the
center, Svelte 5 runes-native components, and hybrid SVG/canvas rendering.

Build polished charts from Svelte components, a fluent builder, or portable
JSON. ggsvelte gives you readable scales, stable colors, contained responsive
rendering, and publication-ready themes before you tune anything.

> **Status: v0.1 is the first public release and intentionally early.** Every export carries a
> lifecycle tag (see `lifecycle.json` and the docs lifecycle page); the
> agent core path (`PortableSpec` / `normalize` / `validate` /
> `renderToSVGString` / `GGPlot`) is `stable-intent`, everything else
> `experimental`.

## What you can make

|                                               Categorical scatter                                               |                                         Loess trend with uncertainty                                         |
| :-------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| ![Penguin body mass plotted against flipper length and colored by species](artifacts/fresh-renders/scatter.png) | ![Dose response scatter plot with a loess trend and confidence interval](artifacts/fresh-renders/smooth.png) |
|                                            **Faceted distributions**                                            |                                               **Time series**                                                |
|                ![Response-time histograms faceted by service](artifacts/fresh-renders/facet.png)                |       ![Daily active users plotted across the first quarter of 2026](artifacts/fresh-renders/time.png)       |

## Install

```sh
bun add @ggsvelte/svelte        # or: npm install @ggsvelte/svelte
```

`@ggsvelte/svelte` pulls in `@ggsvelte/spec` (spec types, validation, builder) and
`@ggsvelte/core` (pipeline + renderers) and re-exports the whole surface.

Requires Node.js 22+ and Svelte 5.29+. Clean packed-artifact installs are
tested with npm, pnpm, and Bun on Ubuntu and Windows; see the
[compatibility matrix](https://ljodea.github.io/ggsvelte/guide/compatibility).

## Why ggsvelte

- **Good defaults without hidden rules** — readable axes, restrained themes,
  sensible inferred scales, and stable categorical colors. Valid but
  questionable choices produce actionable advisories instead of visual
  footguns.
- **Charts stay inside their container** — omitted width is responsive by
  default; a numeric width is the explicit fixed-size opt-in. The plot surface
  clips marks and keeps overlays bounded.
- **Defaults can improve safely** — every spec is stamped with an edition, so
  future improvements do not silently restyle existing charts.
- **Use the right renderer for the data** — SVG for axes, text, and ordinary
  layers; canvas automatically above 2,000 marks; deterministic SVG for export.
- **A real grammar, not a chart-type menu** — 12+ geoms, R-fixture-tested
  statistics, positions, free-scale facets, coordinates, annotations, and
  interaction compose through the same model.
- **Interaction is semantic and opt-in** — inspect and pin data, select points
  or intervals, brush to zoom, and consume typed Svelte 5 events without
  depending on SVG nodes or renderer indices.

Try [inspection and pinning](https://ljodea.github.io/ggsvelte/examples/interaction/tooltip)
or [interval selection and zoom](https://ljodea.github.io/ggsvelte/examples/interaction/brush-zoom),
then [filter groups without losing their colors](https://ljodea.github.io/ggsvelte/examples/interaction/legend-filter)
or [coordinate intervals across facets](https://ljodea.github.io/ggsvelte/examples/interaction/facet-intervals),
bring [your own local JSON rows to the playground](https://ljodea.github.io/ggsvelte/playground),
then read the [interaction guide](https://ljodea.github.io/ggsvelte/guide/interactions)
or [searchable event reference](https://ljodea.github.io/ggsvelte/reference/interactions).

## One spec, three surfaces

**Spec JSON** (what agents emit; JSON Schema at `packages/spec/schema/v0.json`):

```svelte
<script>
  import { GGPlot } from "@ggsvelte/svelte";

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
</script>

<GGPlot {spec} width={640} height={400} />
```

**Fluent builder**:

```ts
import { aes, gg } from "@ggsvelte/svelte";

const spec = gg(rows, aes({ x: "displ", y: "hwy" }))
  .geomPoint()
  .spec();
```

**Svelte components**:

```svelte
<GGPlot data={rows} aes={{ x: "displ", y: "hwy" }} width={640} height={400}>
  <GeomPoint />
</GGPlot>
```

Headless (Node/edge/workers, no DOM):

```ts
import { renderToSVGString } from "@ggsvelte/core";
const svg = renderToSVGString(spec, { width: 640, height: 400 });
```

CLI: `ggsvelte-render spec.json > chart.svg` (JSON-line diagnostics on stderr).

## Packages

| Package                               | What                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`@ggsvelte/svelte`](packages/svelte) | Svelte 5 components + everything re-exported + the CLI                                          |
| [`@ggsvelte/spec`](packages/spec)     | Spec types, JSON Schema, `normalize()`, `validate()`, `lintSpec()`, builder — zero DOM, zero d3 |
| [`@ggsvelte/core`](packages/core)     | Framework-agnostic pipeline + SVG renderer (pure entry) and canvas/hit-index (`/dom` entry)     |

## Agents

- Skill: [`skills/ggsvelte/SKILL.md`](skills/ggsvelte/SKILL.md) (also shipped
  inside the `@ggsvelte/svelte` package).
- Docs site endpoints: `/llms.txt`, `/llms-full.txt`, `/schema/v0.json`.
- Held-out eval harness: `tests/evals/` (`bun run evals`, dry-run without a key).

## Documentation

- [Guide and examples](https://ljodea.github.io/ggsvelte/)
- [Interactions and event reference](https://ljodea.github.io/ggsvelte/guide/interactions)
- [Local data playground](https://ljodea.github.io/ggsvelte/playground)
- [Pre-0.1 interaction migration](https://ljodea.github.io/ggsvelte/guide/migrating-pre-0-1)
- [Lifecycle and editions](https://ljodea.github.io/ggsvelte/guide/lifecycle)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — tool roster (bun, oxlint+tsgolint,
pre-commit), the visual-regression trust model, decision records
(`docs/decisions/`), and the no-time-estimates rule.

## License

[MIT](LICENSE) © Liam O'Dea. Loess reference implementation attribution: see
[NOTICE](NOTICE).
