---
name: ggsvelte
description: Build data visualizations with ggsvelte, a grammar-of-graphics charting library (ggplot2 semantics, Svelte 5 child-component composition, JSON specs, headless SVG rendering). Use whenever creating, editing, validating, or debugging charts, plots, graphs, scatter plots, bar charts, histograms, line charts, boxplots, density plots, violins, heatmaps, maps, faceted/small-multiple charts, or data visualization in a JavaScript/TypeScript/Svelte project; when code imports from "@ggsvelte/svelte", "@ggsvelte/spec", or "@ggsvelte/core"; when composing GGPlot with Geom*/Scale*/Theme*/Facet*/Coord*/Guide*/Labs children; when emitting a ggsvelte plot spec JSON; or when rendering charts server-side/headless to SVG.
---

# ggsvelte

A layered grammar of graphics with ggplot2 nomenclature. Two ways to author the
same grammar — never build SVG or canvas output yourself:

- **Svelte apps (canonical):** `<GGPlot>` with declaration-only children —
  `<GeomPoint/>`, `<ThemeMinimal/>`, `<ScaleXLog10/>`, `<FacetWrap/>`, `<Labs/>`.
- **Agents / headless:** emit a JSON `PortableSpec`, check it with
  `validate(spec)`, render with `renderToSVGString(spec, {width, height})`
  (Node-safe), `ggsvelte-render spec.json > out.svg` (CLI), or `<GGPlot spec>`.
  A third skin, the `gg()` builder, produces the same spec in TypeScript.

## Mental model

```text fragment
spec = data + aes (mappings) + layers[]
       + scales? coord? facet? labs? theme? guides?
one layer = { geom, stat?, position?, positionParams?, aes?, params?, render?, data? }
```

- **data**: `{"values": [rows]}`, `{"columns": {name: [...]}}`, or
  `{"name": "dataset"}` (resolved from `spec.datasets` or runtime data).
- **layers** draw in order — later layers on top (z-order).
- Geom defaults: bar → count+stack, histogram → bin+stack, col/area →
  identity+stack, boxplot → boxplot+dodge, violin → ydensity+dodge,
  jitter → point+jitter, freqpoly → bin, smooth → smooth, count → sum,
  density → density, hex → bin_hex, everything else identity+identity.

## Aes: JSON specs vs Svelte props

The one rule that differs between the two skins:

| Surface                                 | `x: "displ"` bare string              | canonical                |
| --------------------------------------- | ------------------------------------- | ------------------------ |
| JSON `PortableSpec` (incl. `spec` prop) | INVALID                               | `{"field": "displ"}`     |
| Svelte `aes` prop (plot or `Geom*`)     | valid shorthand, expands to `{field}` | same object form also OK |

Canonical channel forms: `{"field": "col"}` maps a column, `{"value": "red"}`
is a constant, `{"stat": "count"}` reads a stat output, `null` unsets an
inherited channel. Layer aes merges over plot aes per channel.
Channels (25): x, y, color, fill, size, linewidth, alpha, shape, linetype,
group, label, weight, ymin, ymax, xmin, xmax, xend, yend, width, height, z,
map_id, angle, radius, sample. Mapped size/linewidth/alpha/shape/linetype work
only on the geoms in `STYLE_AESTHETIC_GEOMS`.

## Svelte composition — children are canonical

```svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    Labs,
    ScaleColorDiscrete,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  const cars = [
    { displ: 1.8, hwy: 29, class: "compact" },
    { displ: 2.0, hwy: 31, class: "compact" },
    { displ: 3.5, hwy: 26, class: "midsize" },
    { displ: 5.3, hwy: 20, class: "suv" },
    { displ: 5.7, hwy: 17, class: "suv" },
    { displ: 6.2, hwy: 16, class: "suv" },
  ];
</script>

<GGPlot data={cars} aes={{ x: "displ", y: "hwy", color: "class" }} height={400}>
  <ThemeMinimal />
  <ScaleColorDiscrete scheme="tableau10" />
  <Labs
    title="Bigger engines, thirstier cars"
    x="Displacement (l)"
    y="Highway mpg"
    color="Class"
  />
  <GeomSmooth method="loess" se={false} />
  <GeomPoint size={3} alpha={0.85} />
</GGPlot>
```

Convention: theme → scales → guides → labs → mark layers. Grammar children
(theme/scale/coord/facet/guides/labs/legend) render no markup and register
declaratively; mark-layer registration order is z-order (points above smooth
here). Every geom takes aesthetics through one `aes` object prop (bare-string
shorthand allowed) and constant style params as direct props (`size={3}`);
structural props are `data`, `stat`, `position`, `positionParams`, `render`.

`<GGPlot>` props: `spec`, `data`, `aes`, `layers`, `key`, `width`
(number | "container"), `height`, `a11y`, `ariaLabel`, the interaction props
(`inspect`, `select`, `zoom`, `legendFocus`, `legendFilter`, `tool`,
`interaction`, `interactionScope`), the `on*` handlers, and `children`.
Instance methods: `resetScales()`, `setZoom()`.

Precedence: `spec` wins over everything else. For mark layers, an explicit
`layers` prop wins over geom children — use it for dynamic layer lists (a keyed
`{#each}` reorder does not preserve z-order). For grammar families, children
win over the deprecated props. Coord/facet/theme REPLACE (last wins); scales
merge per channel; labs/guides/legend merge per key. Duplicates emit
`DUPLICATE_PLOT_LAYER` / `DUPLICATE_SCALE_CHANNEL` / `DUPLICATE_MERGE_KEY`
advisories — full semantics in
[references/composition-surfaces.md](references/composition-surfaces.md).

**Deprecated (since 0.11.0, planned removal in 0.13.0):** the seven `<GGPlot>`
grammar props `facet`, `coord`, `scales`, `guides`, `legend`, `theme`, `labs`.
Compose them as children instead; `spec`, `data`, `aes`, and `layers` stay
first-class. Migrate existing code with `npx ggsvelte-codemod --write src`
(dry-run without `--write`). Using a deprecated prop fires a
`DEPRECATED_PLOT_PROP` advisory via `ondiagnostic`.

## Which geom for which data

| x type           | y type                                | extra              | recommend                                                    |
| ---------------- | ------------------------------------- | ------------------ | ------------------------------------------------------------ |
| quantitative     | quantitative                          | ≤ ~2k rows         | `point` (+ `smooth` layer for trend)                         |
| quantitative     | quantitative                          | many rows          | `point` with `"render": "canvas"`, or `hex`/`bin_2d` density |
| temporal         | quantitative                          | —                  | `line` (multi-series: map `color` to the series field)       |
| nominal/ordinal  | quantitative (pre-aggregated)         | —                  | `col`; many/long labels → add a `flip` coord                 |
| nominal/ordinal  | (none — count rows)                   | —                  | `bar` (count stat; do NOT map y)                             |
| quantitative     | (none — distribution)                 | —                  | `histogram` (or `density` for smooth overlay)                |
| nominal          | quantitative (distribution per group) | —                  | `boxplot` (or `violin` for shape)                            |
| nominal          | nominal                               | —                  | `point` + `"position": "jitter"`, or counts via `count`      |
| quantitative     | quantitative                          | uncertainty bounds | `errorbar` (map ymin/ymax) or `smooth` (se ribbon)           |
| any of the above | + one more nominal field              | few values         | same geom + facet wrap on that field                         |

Only the everyday geoms appear above. All 49 geoms (violin, hex, contour, qq,
step, segment, sf/maps, text/label annotation, …), all 28 stats with their
computed columns, and the position rules live in
[references/geoms-and-stats.md](references/geoms-and-stats.md) — read it
whenever the user wants a geom, stat, or annotation not shown here.

Two rules worth keeping in working memory:

- **Positions are scoped per geom** (a disallowed position is a schema error):
  stack/fill only on bar, col, histogram, area; dodge on those plus boxplot
  and violin; jitter on point, count, jitter; nudge on point, count, text,
  label; identity everywhere.
- **A stat that computes y forbids mapping `aes.y` to a field**
  (bar/histogram/density/…) — the `computed-y-mapped` error. Read stat outputs
  with `{"stat": "count"}` aes.

## Scales, palettes, themes

- x/y families: `{"type": "linear"|"binned"|"time"|"band"}` with
  `"transform": "identity"|"log10"|"sqrt"`, `domain`/`limits`,
  `oob: "censor"|"squish"`, `expand`, `nice`, breaks, `reverse`. Authored
  `type:"log"` canonicalizes to linear+log10. Scale transforms run before
  stats and positions; coord transforms run after stats.
- color/fill families: `ordinal`, `sequential`, `binned`, `manual`,
  `identity`. 34 named schemes — 14 categorical (`observable10`, `tableau10`,
  `colorblind`, `Set1`…) and 20 sequential/diverging (`viridis`, `magma`,
  `Blues`, `RdBu`…). Size/linewidth/alpha and shape/linetype have their own
  scale families.
- Three equivalent skins:
  JSON `"scales": {"x": {"type": "linear", "transform": "log10"}}` ≡ helper
  functions `scaleXLog10()` / `scale_x_log10()` (binding-identical camelCase,
  snake_case, and Colour spellings, from `@ggsvelte/spec`) ≡ components
  `<ScaleXLog10/>`. The `gg()` builder chains the same names:
  `gg(rows, aes({ x: "flipper", y: "mass" })).geomPoint({ alpha: 0.7 }).scaleXLog10().spec()`.
- Temporal: ISO dates/date-times, four-digit-year strings, year-months, and
  year-quarters infer time automatically. Ambiguous ordered dates need
  `"parse": "dmy"` or `"mdy"`; force `{"type": "band"}` for year-like
  identifiers; never preprocess dates into indexes.
- Themes: 24 names (`default`, `light`, `dark`, `minimal`, `ggplot2`,
  `classic`, `bw`, `hrbr`, `few`, `clean`, `fivethirtyeight`, `economist`,
  `tufte`, `linedraw`, `void`, `economist_white`, `solarized_2`,
  `solarized_2dark`, `gdocs`, `hc`, `hcdark`, `pander`, plus
  `grey`/`gray` aliasing `ggplot2`) as
  `<ThemeTufte/>`-style children or `"theme": "tufte"` in JSON.

Full option surfaces — every scale option, the `Scale*` component matrix, all
scheme tables, the whole temporal/parser system:
[references/scales-and-palettes.md](references/scales-and-palettes.md).
Themes, coords, facets, guides, legend order, and `Labs` in depth:
[references/composition-surfaces.md](references/composition-surfaces.md).

## The validation contract (use it!)

`validate(spec)` = schema shape. `validate(spec, { profile })` adds data-aware
checks against a `DataProfile` —
`{"fields": [{"name": "displ", "type": "quantitative"}], "rowCount": 234}`
(types: quantitative | temporal | ordinal | nominal). Every error is:

```json fragment
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
mixed-sign data); `lintSpec(spec)` is the standalone equivalent. Advisories
never block; fix them when they match intent. `normalize(input)` canonicalizes
authoring sugar into a `PortableSpec`; `isPortable`/`toPortable` check and
strip runtime-only fields. CLIs: `ggsvelte-render spec.json > out.svg`
(JSON-line diagnostics on stderr) and `ggsvelte-codemod [--write] src`.

## Recipes (spec JSON — the everyday twelve)

All specs assume inline `"data": {"values": [...]}` or a named dataset.

1. **Scatter** — `{"layers":[{"geom":"point","aes":{"x":{"field":"displ"},"y":{"field":"hwy"}}}]}`; color by category: add `"color":{"field":"class"}`.
2. **Scatter + trend** — `{"aes":{"x":{"field":"x"},"y":{"field":"y"}},"layers":[{"geom":"point"},{"geom":"smooth","params":{"method":"loess"}}]}` (plot-level aes inherits into both layers).
3. **Line (time series)** — `{"layers":[{"geom":"line","aes":{"x":{"field":"date"},"y":{"field":"value"}}}]}`; multi-series: map `"color":{"field":"series"}`.
4. **Column chart (pre-computed heights)** — `{"layers":[{"geom":"col","aes":{"x":{"field":"category"},"y":{"field":"amount"}}}]}`
5. **Bar chart (count rows)** — `{"layers":[{"geom":"bar","aes":{"x":{"field":"category"}}}]}` — never map y on bar.
6. **Horizontal bars** — recipe 4 or 5 + `"coord":{"type":"flip"}`.
7. **Stacked / dodged / proportion bars** — recipe 5 + `"fill":{"field":"subgroup"}` in aes (stack is the default); `"position":"dodge"` for side-by-side, `"position":"fill"` for 100% stacked.
8. **Histogram** — `{"layers":[{"geom":"histogram","aes":{"x":{"field":"measure"}},"params":{"bins":30}}]}` (or `"binwidth"`; never both `center` and `boundary`).
9. **Boxplot by category** — `{"layers":[{"geom":"boxplot","aes":{"x":{"field":"group"},"y":{"field":"value"}}}]}` (x must be discrete).
10. **Facets (small multiples)** — any recipe + `"facet":{"wrap":{"field":"panel"},"ncol":3}` (add `"scales":"free_y"` for per-panel y).
11. **Reference line annotation** — add layer `{"geom":"rule","params":{"yintercept":0}}`.
12. **Finishing** — `"labs":{"title":...,"x":...,"y":...}`, `"width"`/`"height"` in px, `"theme":"minimal"`.

The same charts as Svelte children, twice over:

```svelte fragment
<GGPlot data={sales} aes={{ x: "quarter", y: "amount", fill: "region" }}>
  <GeomCol position="dodge" />
</GGPlot>
```

```svelte fragment
<GGPlot data={measurements} aes={{ x: "value" }}>
  <FacetWrap field="site" ncol={2} />
  <GeomHistogram bins={20} />
</GGPlot>
```

Long-tail recipes — errorbar, value labels, canvas big-scatter, log axis,
violin, tile heatmap, hex density, ECDF step, ribbon, flipped boxplot,
per-layer aes override, sf/map — each as validated JSON plus a Svelte twin:
[references/recipes.md](references/recipes.md).

## Interactions (Svelte props, not spec fields)

Opt-in `<GGPlot>` props: `inspect` (tooltip/crosshair/keyboard/pinning),
`select` (point or interval), `zoom` (brush), `legendFocus` (emphasis only),
`legendFilter` (refilters and reruns the grammar, colors stay stable). Always
give a stable `key` when selection or linked views must survive filtering or
refreshes. Link plots by sharing one `createPlotInteraction()` controller and
matching `interactionScope` channels; observe everything through
`oninteraction` or per-capability handlers. Faceted interval presets, the
controller API, `Tooltip`, handler payloads, and diagnostics:
[references/interactions.md](references/interactions.md) — read it before
writing any interactive or linked-view code.

## Pointers

- JSON Schema (constrained decoding): `packages/spec/schema/v0.json` in the
  repo, `/schema/v0.json` on the docs site, or
  `import schema from "@ggsvelte/spec/schema/v0.json"`.
- Full corpus for models: `/llms-full.txt` on the docs site (all guide prose
  plus every example with spec JSON and Svelte source); index at `/llms.txt`.
- Error catalog: `/guide/errors`; advisories: `/guide/advisories`;
  lifecycle/editions: `/guide/lifecycle` (specs are stamped with the current
  appearance edition, currently 2). Upgrading off deprecated props:
  `/guide/upgrading`.
- References in this skill — read the one that matches the task:
  [geoms-and-stats.md](references/geoms-and-stats.md) (any geom/stat/position
  beyond the everyday set, annotations),
  [scales-and-palettes.md](references/scales-and-palettes.md) (scale options,
  palettes, temporal),
  [composition-surfaces.md](references/composition-surfaces.md) (themes,
  coords, facets, guides, merge semantics),
  [interactions.md](references/interactions.md) (tooltips, selection, linking),
  [recipes.md](references/recipes.md) (long-tail chart recipes).
