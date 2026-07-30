---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(svelte): move legend filter opt-in to `<GuideLegend filter>`

Legend filter is now a host-only prop on `<GuideLegend channel="…" filter />`
(boolean or `{ mode?, multiple? }`), not a PortableSpec / guideLegend field.
Only channels with an active filter child get Show-group checkboxes
(merged legends match via `aesthetics[]`).

`<GGPlot legendFilter>` still works plot-wide until 0.20.0 and emits
`DEPRECATED_PLOT_PROP` with migration guidance.

Migration: <https://ggsvelte.sh/guide/upgrading#legend-filter-on-guidelegend>

Replace:

```svelte
<GGPlot legendFilter key="id" …>
  <GeomPoint />
</GGPlot>
```

with:

```svelte
<GGPlot key="id" …>
  <GuideLegend channel="color" filter />
  <GeomPoint />
</GGPlot>
```

Use the aesthetic that owns the discrete legend (`color`, `fill`, `shape`, …).
Focus and filter can share one GuideLegend:
`<GuideLegend channel="color" focus filter />`.
