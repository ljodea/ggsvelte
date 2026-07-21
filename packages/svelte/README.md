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
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

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
