# ggsvelte

A layered grammar of graphics for JavaScript — ggplot2 semantics (aes, geom,
stat, scale, coord, facet, theme, position), a strictly-JSON spec at the
center, Svelte 5 runes-native components, and hybrid SVG/canvas rendering.
Agent-first: language models emit a `PortableSpec` validated by a published
JSON Schema; a deterministic renderer draws it.

> **Status: pre-0.1.0, explicitly unstable.** Every export carries a
> lifecycle tag (see `lifecycle.json` and the docs lifecycle page); the
> agent core path (`PortableSpec` / `normalize` / `validate` /
> `renderToSVGString` / `GGPlot`) is `stable-intent`, everything else
> `experimental`.

## Install

```sh
bun add ggsvelte        # or: npm install ggsvelte
```

`ggsvelte` pulls in `@ggsvelte/spec` (spec types, validation, builder) and
`@ggsvelte/core` (pipeline + renderers) and re-exports the whole surface.

## One spec, three surfaces

**Spec JSON** (what agents emit; JSON Schema at `packages/spec/schema/v0.json`):

```svelte
<script>
  import { GGPlot } from "ggsvelte";

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
import { aes, gg } from "ggsvelte";

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

## Why ggsvelte

- **Value-stable color scales** — remove a series and nothing else changes
  color; a returning series gets its old color back.
- **Prescriptive validation for agents** — every error is
  `{ code, path, message, allowed?, fix: { description, example } }`; the
  fix example is machine-applicable. `lintSpec` adds advisories for
  valid-but-questionable specs.
- **Defaults editions** — specs are stamped `edition: 1`; future default
  improvements never restyle existing charts.
- **Hybrid rendering** — SVG axes/text/legends, canvas for high-count layers
  (auto above 2000 marks, `a11y: "force-svg"` escape hatch),
  all-SVG export path.
- **12+ geoms, R-fixture-tested stats** (bin, lm/loess smooth, boxplot,
  density, summary), panel-aware facets (wrap + grid, free scales),
  `coord: flip`, tooltips/brush/zoom.

## Packages

| Package                           | What                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`ggsvelte`](packages/svelte)     | Svelte 5 components + everything re-exported + the CLI                                          |
| [`@ggsvelte/spec`](packages/spec) | Spec types, JSON Schema, `normalize()`, `validate()`, `lintSpec()`, builder — zero DOM, zero d3 |
| [`@ggsvelte/core`](packages/core) | Framework-agnostic pipeline + SVG renderer (pure entry) and canvas/hit-index (`/dom` entry)     |

## Agents

- Skill: [`skills/ggsvelte/SKILL.md`](skills/ggsvelte/SKILL.md) (also shipped
  inside the `ggsvelte` package).
- Docs site endpoints: `/llms.txt`, `/llms-full.txt`, `/schema/v0.json`.
- Held-out eval harness: `tests/evals/` (`bun run evals`, dry-run without a key).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — tool roster (bun, oxlint+tsgolint,
pre-commit), the visual-regression trust model, decision records
(`docs/decisions/`), and the no-time-estimates rule.

## License

[MIT](LICENSE) © Liam O'Dea. Loess reference implementation attribution: see
[NOTICE](NOTICE).
