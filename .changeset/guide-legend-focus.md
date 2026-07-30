---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(svelte): move legend focus opt-in to `<GuideLegend focus>`

Legend focus is now a host-only prop on `<GuideLegend channel="…" focus />`
(boolean or `{ preview?: boolean }`), not a PortableSpec / guideLegend field.
Only channels with an active focus child get interactive legend targets
(merged legends match via `aesthetics[]`).

`<GGPlot legendFocus>` still works plot-wide until 0.20.0 and emits
`DEPRECATED_PLOT_PROP` with migration guidance.

Migration: <https://ggsvelte.sh/guide/upgrading#legend-focus-on-guidelegend>

Replace:

```svelte
<GGPlot legendFocus key="id" …>
  <GeomPoint />
</GGPlot>
```

with:

```svelte
<GGPlot key="id" …>
  <GuideLegend channel="color" focus />
  <GeomPoint />
</GGPlot>
```

Use the aesthetic that owns the discrete legend (`color`, `fill`, `shape`, …).
Focus-only GuideLegend children do not force a `type: "legend"` guide, so
continuous colour scales keep their colorbar.
