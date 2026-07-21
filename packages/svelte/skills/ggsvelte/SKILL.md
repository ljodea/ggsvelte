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
  fill (bars/areas), group, label, weight, ymin, ymax. The schema also reserves
  mapped size, linewidth, and alpha, but this release does not yet render those
  field mappings; use geom params for constant styling until that capability lands.
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
  the value to y, then flip). Post-stat projection uses
  `{"type":"transform","x":{"transform":"log10"},"y":{"transform":"sqrt"}}`
  with optional semantic `limits`, `reverse`, `expand`, and plot-level `clip`.
  Use `coordTransform`/`coord_transform`; unlike scale transforms, coordinate
  transforms preserve stat inputs, tessellate curved render topology, and
  invert coordinates before scales for interactions. Non-identity coordinate
  transforms require continuous non-temporal axes.
- **facet**: wrap form `{"wrap": {"field": "g"}, "ncol": 3}` XOR grid form
  `{"rows": {...}, "cols": {...}}`; `"scales": "fixed"|"free"|"free_x"|"free_y"`.
- **scales**: canonical x/y families are `{"type": "linear"|"binned"|"time"|"band"}`.
  Numeric continuous/binned scales accept `"transform":"identity"|"log10"|"sqrt"`,
  semantic `domain`/`limits`, `oob:"censor"|"squish"`, `expand`, `nice`,
  major/minor breaks, and `reverse`. Authored `type:"log"` is accepted but
  canonicalizes to `type:"linear", transform:"log10"`; trained models never
  report type `log`. Scale transforms run before stats and positions. Binned
  integer ids remain private; guides, candidates, and events use semantic values.
  Helpers include `scaleXLog10`, `scaleYSqrt`, `scaleXBinned` and binding-identical
  `scale_x_log10`, `scale_y_sqrt`, `scale_x_binned` aliases. Time scales additionally accept `"parse"` (closed names such as `"dmy"`,
  exact `{ "format": ... }`, or `{ "epoch": "seconds"|"milliseconds" }`),
  `"temporalKind"`, `"timezone"`, `"disambiguation"`,
  `"parseFailure":"error"|"censor"`, `"dateBreaks"`,
  `"dateMinorBreaks"`, `"dateLabels"`, `"locale"`, and `"weekStart"`.
  `{"type": "ordinal"|"sequential", "scheme"?, "range"?, "domain"?}` for
  color/fill. Defaults are inferred and disclosed as advisories.
- **temporal defaults**: ISO dates/date-times, four-digit year strings,
  year-months, month-years, and year-quarters infer time after bounded sampling
  plus whole-column validation. Ambiguous ordered dates stay discrete: set
  `"parse":"dmy"` or `"parse":"mdy"`. For year-like identifiers, force
  `{"type":"band"}`. Never preprocess dates into indexes. Automatic temporal
  labels use measured panel extent and calendar boundaries; inspect
  `model.guidePlans` for the selected interval and visible/full labels.
- **temporal override rules**: `.scaleXDate()`/`.scaleYDate()` serialize mapped
  authoring `Date` cells as calendar dates; `.scaleXDatetime()`/
  `.scaleYDatetime()` preserve instants.
  Explicit `linear`/`binned` (including authored alias `log`) disables temporal inference, so numeric strings stay
  quantitative. Explicit ordinal color/fill keeps temporal-looking labels as
  separate groups; sequential temporal color/fill uses parsed domains and
  calendar legend labels. Censoring is available only with an explicit parser;
  invalid configuration and ambiguous automatic inference remain errors.
  Use e.g. `.scaleXDatetime({ dateBreaks: "2 weeks", dateMinorBreaks: "1 day",
dateLabels: "%e %b", locale: "en-GB", timezone: "Europe/London" })`.
  Explicit `breaks` outrank `dateBreaks`; `dateLabels` outranks `labels`.
  Authored labels are preserved with a diagnostic rather than silently
  rotated, thinned, or truncated.
- Rendering surfaces: `<GGPlot spec={...}/>` (Svelte),
  `renderToSVGString(spec, {width, height})` (headless, Node-safe),
  `ggsvelte-render spec.json > out.svg` (CLI; JSON-line diagnostics on stderr).

## Svelte interactions (v0.2+)

`@ggsvelte/svelte` requires Svelte `^5.33.1`. Interactions are opt-in props on
`<GGPlot>`; always provide a stable `key` field when selection or linked views
must survive filtering, reordering, or data refreshes.

```svelte
<script lang="ts">
  import { createPlotInteraction, GGPlot } from "@ggsvelte/svelte";

  const interaction = createPlotInteraction<number>();
  const scope = { keys: "sales-rows", intervals: "sales-range" } as const;
</script>

<GGPlot
  data={rows}
  aes={{ x: "date", y: "value", color: "series" }}
  layers={[{ geom: "point" }]}
  facet={{ wrap: "region", ncol: 3 }}
  key="id"
  select={{ type: "interval", mode: "x", preset: "cross-panel" }}
  legendFocus
  legendFilter
  {interaction}
  interactionScope={scope}
  oninteraction={(event) => console.log(event)}
/>
```

- `inspect` adds tooltip, crosshair, keyboard traversal, and pinning; `select`
  supports point or interval selection; `zoom` enables brush zoom.
- Faceted interval presets are `independent`, `union`, and `cross-panel`.
  After an interval or zoom commit, accessible controls accept exact bounds.
- `legendFocus` only emphasizes a discrete group. `legendFilter` changes the
  included rows and reruns the grammar while preserving stable color identity.
- Share one `createPlotInteraction()` controller between plots to link semantic
  selection, emphasis, interval, and zoom state. Give plots matching
  `interactionScope` channels only when they should coordinate.
- Use controlled controller methods such as `setSelection`, `setInterval`, and
  `setZoom` for external controls. Observe all interaction kinds through
  `oninteraction`, or use capability-specific handlers such as `onselect`,
  `onzoom`, `onlegendfocus`, and `onlegendfilter`.
- A handler without its matching capability prop, or `interactionScope` without
  an `interaction` controller, is inert and emits a development advisory.

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
colors, stacked negative areas, discrete×discrete scatter, transform-domain
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
4. **Line (time series)** — `{"layers":[{"geom":"line","aes":{"x":{"field":"date"},"y":{"field":"value"}}}]}` (ISO dates, raw four-digit years, year-months, and year-quarters infer time automatically; add `"scales":{"x":{"type":"time","parse":"dmy"}}` only for an explicit ordered parser)
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
20. **Big scatter (canvas)** — recipe 1 + `"render":"canvas"` on the layer (or let >2000 marks auto-switch; `"a11y":"force-svg"` at plot level overrides for assistive tech). Log10 axis: `"scales":{"x":{"type":"linear","transform":"log10"}}` (positive data only; transform runs before stats). Jittered categorical scatter: `"position":"jitter"` on a point layer.

Finish with `"labs": {"title": ..., "x": ..., "y": ...}` for human-readable
labels, `"width"`/`"height"` in px, `"theme": "default"|"light"|"dark"|"minimal"`.

## References

- JSON Schema (constrained decoding): `packages/spec/schema/v0.json` in the
  repo, `/schema/v0.json` on the docs site, or
  `import schema from "@ggsvelte/spec/schema/v0.json"`.
- Full corpus for models: `/llms-full.txt` on the docs site (all guide prose
  - every example with spec JSON and Svelte source); index at `/llms.txt`.
- Error catalog: `/guide/errors`; advisories: `/guide/advisories`;
  lifecycle/editions: `/guide/lifecycle` (specs are stamped with the current
  appearance edition, currently 2; editions do not preserve incorrect pre-1.0
  parser or scale execution).
