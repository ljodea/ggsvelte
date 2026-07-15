---
name: ggsvelte
description: Build data visualizations with ggsvelte, a grammar-of-graphics charting library (ggplot2 semantics, JSON specs, Svelte 5 components, headless SVG rendering). Use whenever creating, editing, validating, or debugging charts, plots, graphs, scatter plots, bar charts, histograms, line charts, boxplots, density plots, faceted/small-multiple charts, or data visualization in a JavaScript/TypeScript/Svelte project; when code imports from "@ggsvelte/svelte", "@ggsvelte/spec", or "@ggsvelte/core"; when emitting a ggsvelte plot spec JSON; or when rendering charts server-side/headless to SVG.
---

# ggsvelte

A layered grammar of graphics with ggplot2 nomenclature. **You emit a JSON
`PortableSpec`; a deterministic renderer draws it.** Never build SVG or
canvas output yourself — describe the plot, let the pipeline render it.

## Mental model

```text
spec = data + aes (mappings) + layers[]        one layer = { geom, stat, position, aes?, params? }
       + scales? coord? facet? labs? theme?
```

- **data**: `{"values": [rows]}`, `{"columns": {name: [...]}}`, or
  `{"name": "dataset"}` (resolved from `spec.datasets` or runtime data).
- **aes**: channel → canonical form. `{"field": "col"}` maps a data column;
  `{"value": "red"}` is a constant; `{"stat": "count"}` reads a stat output;
  `null` unsets an inherited channel. **Bare strings are invalid in JSON
  specs** — always `{"field": ...}`. Channels: x, y, color (strokes/points),
  fill (bars/areas), size, linewidth, alpha, group, label, weight, ymin, ymax.
- **layers**: drawn in order. Geoms: `point, line, col, bar, histogram, area,
rule, text, smooth, boxplot, density, errorbar`. Each geom has a default
  stat/position (bar → count+stack, histogram → bin+stack, col/area →
  identity+stack, boxplot → boxplot+dodge, everything else identity).
- **stats compute columns**: count→`count`; bin→`count, density, ncount,
ndensity`; density→`density, scaled`; smooth→`y, ymin, ymax, se`;
  boxplot→`ymin, lower, middle, upper, ymax`; summary→`y, ymin, ymax`.
  A stat that computes y means you must NOT map `aes.y` to a field
  (bar/histogram/density) — the `computed-y-mapped` error.
- **positions**: `stack, fill` (proportions), `dodge` (side-by-side),
  `jitter` (seeded, deterministic), `nudge`, `identity`.
- **coord**: `{"type": "flip"}` = horizontal bars (map the category to x,
  the value to y, then flip). The ONLY orientation mechanism.
- **facet**: wrap form `{"wrap": {"field": "g"}, "ncol": 3}` XOR grid form
  `{"rows": {...}, "cols": {...}}`; `"scales": "fixed"|"free"|"free_x"|"free_y"`.
- **scales**: per channel: `{"type": "linear"|"log"|"time"|"band"}` for x/y;
  `{"type": "ordinal"|"sequential", "scheme"?, "range"?, "domain"?}` for
  color/fill. Defaults are inferred and disclosed as advisories.
- Rendering surfaces: `<GGPlot spec={...}/>` (Svelte),
  `renderToSVGString(spec, {width, height})` (headless, Node-safe),
  `ggsvelte-render spec.json > out.svg` (CLI; JSON-line diagnostics on stderr).

## The validation contract (use it!)

`validate(spec)` = schema shape. `validate(spec, { profile })` adds
data-aware checks against a `DataProfile` —
`{"fields": [{"name": "displ", "type": "quantitative"}], "rowCount": 234}`
(types: quantitative | temporal | ordinal | nominal). Every error is:

```json
{
  "code": "unknown-field",
  "path": "/layers/0/aes/x",
  "message": "Unknown field \"dsipl\" (available: displ, hwy). Did you mean \"displ\"?",
  "allowed": ["displ", "hwy"],
  "fix": {
    "description": "Map \"x\" to \"displ\".",
    "example": { "field": "displ" }
  }
}
```

**Errors include `fix.example` — apply it at `path` and re-validate.**
`validate(spec, { lint: true })` additionally returns advisories for
valid-but-questionable specs (line over unordered categories, >10 discrete
colors, stacked negative areas, discrete×discrete scatter, log over
mixed-sign data). Advisories never block; fix them when they match intent.

## Which geom for which data (DataProfile → recommendation)

| x type           | y type                                | extra              | recommend                                                            |
| ---------------- | ------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| quantitative     | quantitative                          | ≤ ~2k rows         | `point` (+ `smooth` layer for trend)                                 |
| quantitative     | quantitative                          | many rows          | `point` with `"render": "canvas"`, or `histogram`/`density` per axis |
| temporal         | quantitative                          | —                  | `line` (multi-series: map `color` to the series field)               |
| nominal/ordinal  | quantitative (pre-aggregated)         | —                  | `col`; many/long labels → add `"coord": {"type": "flip"}`            |
| nominal/ordinal  | (none — count rows)                   | —                  | `bar` (count stat; do NOT map y)                                     |
| quantitative     | (none — distribution)                 | —                  | `histogram` (or `density` for smooth overlay)                        |
| nominal          | quantitative (distribution per group) | —                  | `boxplot`                                                            |
| nominal          | nominal                               | —                  | `point` + `"position": "jitter"`, or counts via size                 |
| quantitative     | quantitative                          | uncertainty bounds | `errorbar` (map ymin/ymax) or `smooth` (se ribbon)                   |
| any of the above | + one more nominal field              | few values         | same geom + `facet.wrap` on that field                               |

Annotations (reference lines): `rule` with `params.yintercept`/`xintercept`
(no aes). Data-driven rules: map exactly ONE of aes.x / aes.y.

## Recipes (canonical spec JSON — top 20)

All specs assume inline `"data": {"values": [...]}` or a named dataset.
`A` = aes shorthand shown expanded once, then abbreviated for space.

1. **Scatter** — `{"layers":[{"geom":"point","aes":{"x":{"field":"displ"},"y":{"field":"hwy"}}}]}`
2. **Scatter colored by category** — add `"color":{"field":"class"}` to the aes.
3. **Scatter + trend** — `{"aes":{"x":{"field":"x"},"y":{"field":"y"}},"layers":[{"geom":"point"},{"geom":"smooth","params":{"method":"loess"}}]}` (plot-level aes inherits into both layers)
4. **Line (time series)** — `{"layers":[{"geom":"line","aes":{"x":{"field":"date"},"y":{"field":"value"}}}],"scales":{"x":{"type":"time"}}}` (ISO date strings infer time automatically)
5. **Multi-series line** — map `"color":{"field":"series"}` (grouping follows).
6. **Column chart (pre-computed heights)** — `{"layers":[{"geom":"col","aes":{"x":{"field":"category"},"y":{"field":"amount"}}}]}`
7. **Bar chart (count rows per category)** — `{"layers":[{"geom":"bar","aes":{"x":{"field":"category"}}}]}` — never map y on bar.
8. **Horizontal bars** — recipe 6 or 7 + `"coord":{"type":"flip"}`.
9. **Stacked bars** — recipe 7 + `"fill":{"field":"subgroup"}` in aes (stack is the default position).
10. **Dodged (grouped) bars** — recipe 9 + `"position":"dodge"` on the layer.
11. **Proportion bars (100% stacked)** — recipe 9 + `"position":"fill"`.
12. **Histogram** — `{"layers":[{"geom":"histogram","aes":{"x":{"field":"measure"}},"params":{"bins":30}}]}` (or `"binwidth"`; never both `center` and `boundary`).
13. **Density overlay** — `{"layers":[{"geom":"density","aes":{"x":{"field":"measure"},"color":{"field":"group"}}}]}`
14. **Boxplot by category** — `{"layers":[{"geom":"boxplot","aes":{"x":{"field":"group"},"y":{"field":"value"}}}]}` (x must be discrete)
15. **Stacked area** — `{"layers":[{"geom":"area","aes":{"x":{"field":"date"},"y":{"field":"value"},"fill":{"field":"series"}}}]}`
16. **Errorbar (mean ± se)** — `{"layers":[{"geom":"errorbar","stat":"summary","aes":{"x":{"field":"group"},"y":{"field":"value"}}}]}`
17. **Reference line annotation** — add layer `{"geom":"rule","params":{"yintercept":0}}`.
18. **Value labels on columns** — recipe 6 + layer `{"geom":"text","aes":{"x":{"field":"category"},"y":{"field":"amount"},"label":{"field":"amount"}},"params":{"dy":-8}}` (`dy`/`dx` are px offsets; `position: "nudge"` + `positionParams.x/y` offsets in DATA units)
19. **Facets (small multiples)** — any recipe + `"facet":{"wrap":{"field":"panel"},"ncol":3}` (add `"scales":"free_y"` for per-panel y).
20. **Big scatter (canvas)** — recipe 1 + `"render":"canvas"` on the layer (or let >2000 marks auto-switch; `"a11y":"force-svg"` at plot level overrides for assistive tech). Log axis: `"scales":{"x":{"type":"log"}}` (positive data only). Jittered categorical scatter: `"position":"jitter"` on a point layer.

Finish with `"labs": {"title": ..., "x": ..., "y": ...}` for human-readable
labels, `"width"`/`"height"` in px, `"theme": "default"|"light"|"dark"|"minimal"`.

## References

- JSON Schema (constrained decoding): `packages/spec/schema/v0.json` in the
  repo, `/schema/v0.json` on the docs site, or
  `import schema from "@ggsvelte/spec/schema/v0.json"`.
- Full corpus for models: `/llms-full.txt` on the docs site (all guide prose
  - every example with spec JSON and Svelte source); index at `/llms.txt`.
- Error catalog: `/guide/errors`; advisories: `/guide/advisories`;
  lifecycle/editions: `/guide/lifecycle` (specs are stamped `"edition": 1` —
  leave it alone; it freezes default aesthetics).
