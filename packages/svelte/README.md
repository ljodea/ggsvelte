# @ggsvelte/svelte

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-svelte)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fsvelte)

Svelte 5 components for ggsvelte's layered grammar of graphics. This package also
re-exports the spec and core surfaces and includes the `ggsvelte-render` CLI.

```sh
bun add @ggsvelte/svelte
# or: npm install @ggsvelte/svelte
```

Requires Node.js 22+ and Svelte 5.33.1+.

## Example

```svelte
<script lang="ts">
  import { GeomPoint, GGPlot, guideLegend } from "@ggsvelte/svelte";

  const rows = [
    { engine: 1.8, highway: 29, class: "compact" },
    { engine: 2.4, highway: 31, class: "compact" },
    { engine: 3.3, highway: 22, class: "midsize" },
    { engine: 4.7, highway: 18, class: "suv" },
    { engine: 5.7, highway: 16, class: "suv" },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "engine", y: "highway", color: "class" }}
  guides={{ color: guideLegend({ position: "auto" }) }}
  labs={{
    title: "Highway efficiency by engine size",
    x: "Engine displacement",
    y: "Highway mileage",
    color: "Class",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={4} />
</GGPlot>
```

`<GGPlot>` composes geoms, statistics, positions, scales, facets, coordinates,
themes, and semantic interaction. Ordinary layers render as SVG; dense point layers
can render on canvas while axes, legends, text, and accessible descriptions remain in
the DOM.

Use `coord={coordTransform({ x: "log10" })}` to project final geometry after
statistics without changing the values consumed by a fit or bin. Nonlinear paths are
tessellated without creating inspectable rows, and interval or brush inversion returns
semantic values.

Color/fill helpers are re-exported from the package root. For example,
`scales={scaleColorBinned({ breaks: [0, 10, 100], range: ["#ddd", "#222"] })}`
renders deterministic color steps and a colorsteps guide. Continuous,
discrete, log10, sqrt, date, datetime, manual, and identity families use the
same JSON accepted by `<GGPlot>`, with binding-identical `color`/`colour` and
ggplot2 snake-case aliases.

Size, linewidth, alpha, shape, and linetype helpers are also re-exported from
the package root. Their per-mark/per-path vectors render consistently in SVG,
canvas, and SSR; style legends retain keyboard focus and filtering behavior,
and inspection reports resolved semantic style values.

Pass `guides` directly to `<GGPlot>` to suppress or restyle axes and to place,
orient, title, order, or force legends/colorbars/colorsteps. Automatic guides move
from right to bottom at narrow widths without retraining scales; merged exact-value
entries keep keyboard focus and filtering across every represented aesthetic. The
same planned scene renders in browser SVG, headless SVG, and SSR.

## Links

- [Documentation](https://ggsvelte.sh/)
- [Getting started](https://ggsvelte.sh/guide/getting-started)
- [Example gallery](https://ggsvelte.sh/examples)
- [Interactions and events](https://ggsvelte.sh/reference/interactions)
- [Compatibility](https://ggsvelte.sh/guide/compatibility)
- [Upgrading](https://ggsvelte.sh/guide/upgrading)
- [Repository](https://github.com/ljodea/ggsvelte)

The API remains pre-1.0. Lifecycle and compatibility contracts are documented in the
repository and on the docs site.

[MIT](https://github.com/ljodea/ggsvelte/blob/main/LICENSE) © Liam O'Dea
