<!-- Source of truth: packages/spec/src/schema-names.ts (THEME_NAMES), packages/svelte/src/lib/index.ts (component exports), packages/svelte/src/lib/plot-props.ts, packages/svelte/src/lib/layers/ (merge semantics, grammar-families). Inventory tables are asserted complete by scripts/skill-content.test.ts. -->

# Composition surfaces: themes, coords, facets, guides, labs

Every surface here exists in three equivalent forms: a key in the JSON
`PortableSpec`, a deprecated `<GGPlot>` prop (removable in 0.13.0), and a
declaration-only child component (canonical in Svelte). Child components emit
no markup, register on init, unregister on destroy, and are inert without a
`<GGPlot>` ancestor.

## Themes

JSON form: `"theme": "minimal"` (a registered name) or a theme object —
optional `"name"` base plus role overrides, e.g.
`{"name": "dark", "ink": "#eee"}`. `grey` and `gray` are registered aliases of
`ggplot2` (same token map).

| Name                    | Look                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| default                 | quiet hrbrthemes-style base: real typography, hairline grid, no axis frame |
| light                   | light grid, thin panel border, x/y ticks                                   |
| dark                    | dark paper and panel, light ink                                            |
| minimal                 | light grid only, no ticks or border                                        |
| ggplot2                 | classic grey panel, white grid                                             |
| classic                 | no grid, black axis lines and ticks                                        |
| bw                      | white panel, grey grid, black rectangular border (print/B&W)               |
| hrbr                    | same token map as default                                                  |
| few                     | no grid, thin panel border (Stephen Few)                                   |
| clean                   | dashed y grid only, axis lines and ticks                                   |
| fivethirtyeight         | grey paper and panel, white grid, blue accent                              |
| economist               | pale blue paper, white grid, x ticks, red accent                           |
| tufte                   | monochrome ink, no grid                                                    |
| linedraw                | black-on-white line art: hairline black grid, black border                 |
| void                    | no axes, grid, or panel chrome; marks and legends remain                   |
| stata                   | Stata s2color: bluish-gray plot region, white panel, y-grid                |
| stata_s1color           | Stata s1color: white panel with black border, light y-grid                 |
| stata_mono              | Stata s2mono: gray plot region, monochrome y-grid                          |
| solarized               | Solarized light: cream panel, muted base1 chrome, blue accent              |
| solarizeddark           | Solarized dark: deep teal panel, muted base01 chrome, blue accent          |
| economist_white         | Economist Graphic Detail: white panel, gray grid, light-gray paper         |
| solarized_2             | Solarized grey-style variant: base2 panel, base3 grid, no frame            |
| solarized_2dark         | solarized_2 on dark base tones                                             |
| wsj                     | Wall Street Journal: brown paper, dotted black y-grid, x line + ticks      |
| gdocs                   | Google Docs: black x line, no ticks, light-gray grid, plain 20px title     |
| hc                      | Highcharts default: y-only #D8D8D8 grid on white, no border                |
| hcdark                  | Highcharts darkunica: #2a2a2b paper, #707073 y-grid                        |
| pander                  | pander: dashed grey grid and ticks, bold title on white                    |
| calc                    | LibreOffice Calc: white panel, gray70 border + y-grid, no axis lines       |
| excel                   | Excel 97 classic: gray panel, black y-grid + border (horizontal=TRUE)      |
| excel_new               | modern Excel: dark-gray ink, hairline #bfbfbf y-grid, no ticks or border   |
| base                    | base R: black frame and ticks, no grid, bold title                         |
| igray                   | inverse gray: white panel, gray90 surround and grid                        |
| map                     | every axis/panel/grid element blank — marks only, for maps                 |
| solid                   | nothing but marks — every non-geom element removed                         |
| grey (alias of ggplot2) | UK theme_grey                                                              |
| gray (alias of ggplot2) | US theme_gray                                                              |

Svelte: one named shell per product theme — `ThemeDefault`, `ThemeLight`,
`ThemeDark`, `ThemeMinimal`, `ThemeGgplot2`, `ThemeClassic`, `ThemeBw`,
`ThemeHrbr`, `ThemeFew`, `ThemeClean`, `ThemeFivethirtyeight`,
`ThemeEconomist`, `ThemeTufte`, `ThemeLinedraw`, `ThemeVoid`, `ThemeStata`, `ThemeStatas1color`, `ThemeStatamono`, `ThemeSolarized`,
`ThemeSolarizeddark`, `ThemeEconomistwhite`, `ThemeSolarized2`, `ThemeSolarized2dark`,
`ThemeWsj`, `ThemeGdocs`, `ThemeHc`, `ThemeHcdark`, `ThemePander`, `ThemeCalc`, `ThemeExcel`, `ThemeExcelnew`, `ThemeBase`, `ThemeIgray`, `ThemeMap`, `ThemeSolid`, `ThemeGrey`, `ThemeGray`. Escape hatch `<Theme name={dynamicName} />` for
reactive names.
Every shell and `<Theme>` also accepts role-override props (`ink`, `paper`,
`accent`, `grid`, `panel`, `axisText`, `axisLine`, `tickColor`,
`panelBorder`, tooltip/selection/focus roles, …): `<ThemeDark ink="#eee" />`.

## Coords

Components: `Coord` (escape hatch, `value: CoordSpec | "flip"`), `CoordFlip`,
`CoordCartesian`, `CoordTransform`, `CoordFixed`, `CoordEqual` (alias of
`CoordFixed`), `CoordSf`. `<CoordCartesian/>` registers `{"type":"cartesian"}`,
which `normalize()` drops when bare — use it to clear an earlier coord under
REPLACE. JSON forms:

```json fragment
"coord": {"type": "flip"}
```

```json fragment
"coord": {
  "type": "transform",
  "x": {"transform": "log10", "limits": [1, 1000], "reverse": false, "expand": true},
  "y": {"transform": "sqrt"},
  "clip": true
}
```

- Coord transform runs AFTER stats and scale training (scale `transform` runs
  before stats). It preserves stat inputs; coordinate `limits` are a viewport —
  they never remove rows or recompute statistics. `expand` (default true) adds
  a 5% display expansion to explicit limits; `clip` (default true) clips marks
  to the panel.
- Non-identity coordinate transforms require continuous, non-temporal
  position scales on the transformed axes.
- `{"type": "fixed", "ratio": 1}`: ratio is physical y-unit length divided by
  physical x-unit length (default 1). Layout fits the largest centered data
  rectangle after chart chrome. Fixed-aspect coords reject free positional
  facet scales (`coord-fixed-free-scales` error).
- `{"type": "sf"}` (`<CoordSf/>`): fixed-aspect coords for already-projected
  map data; no CRS reprojection in v1. Accepts `ratio` like fixed.

## Facets

Components: `Facet` (full `FacetInput` surface), `FacetWrap` (`field`,
`ncol?`, `scales?`, `strip?`), `FacetGrid` (`rows?`, `cols?`, `scales?`,
`strip?`). `field`/`rows`/`cols` accept a bare string or
`{ field, levels?, labels? }` for authored panel order and strip text. Wrap
form is mutually exclusive with rows/cols; a bare `<Facet/>` fails validate
with `facet-form-missing`.

```json fragment
"facet": {"wrap": {"field": "region"}, "ncol": 3, "scales": "free_y",
          "strip": {"position": "top", "show": true}}
```

- Panels partition the data BEFORE stats and positions run — each panel
  computes its own counts, bins, and stacks.
- `scales`: `"fixed"` (default — panels share both positional scales) |
  `"free"` | `"free_x"` | `"free_y"`. Discrete color/fill assignments are
  ALWAYS global (one legend), whatever `scales` says.
- `strip`: `position` `"top"` (default) | `"bottom"` | `"left"` | `"right"`
  (left/right strips take layout space rather than overlaying the panel);
  `show` (default true) — set false when direct labels are authored elsewhere.

## Guides, legend, labs

Guides are keyed by aesthetic channel: `x`, `y`, `color`, `fill`, `size`,
`linewidth`, `alpha`, `shape`, `linetype`. Components: `Guides`
(escape hatch, `value: GuidesSpec`), plus one shell per guide type carrying a
`channel` prop — `GuideAxis` (channels `x`/`y` only), `GuideLegend`,
`GuideColorbar`, `GuideColorsteps` (non-position channels), `GuideNone` (any
channel). `<GuideLegend channel="color" position="bottom"/>` assembles
`guides: {"color": {"type": "legend", "position": "bottom"}}`.

- Top-level `guides` override a scale-local `guide`.
- Shared options: `title`, `theme` (bounded size/gap overrides), `collision`;
  non-position guides add integer `order` (placement rank), `position`
  `"auto"|"right"|"bottom"`, `direction` `"auto"|"vertical"|"horizontal"`,
  and `force` (show a guide suppressed by default, e.g. identity scales).
- Responsive rule: `auto`-positioned non-position guides move below the panel
  when the viewport is 480px wide or less, or when a right guide would leave
  under 320px of panel (after an estimated 80px of other chrome).
- `<Legend order="stable-domain"|"present-first-seen"|"sorted"/>` is the
  plot-wide legend ENTRY-SORT enum (default `stable-domain`; ordering never
  changes color assignments). Distinct from `<GuideLegend order={2}/>`, a
  per-aesthetic integer placement rank — same word, unrelated concepts.
- `Labs` takes flat string props: `title`, `subtitle`, `caption`, `x`, `y`,
  `color`, `fill`, `size`, `linewidth`, `alpha`, `shape`, `linetype`. The
  spec type is re-exported from `@ggsvelte/svelte` as `LabsSpec`.

```svelte fragment
<GGPlot
  data={rows}
  aes={{ x: "cat", y: "val", fill: "group" }}
  layers={[{ geom: "col" }]}
>
  <CoordFlip />
  <FacetWrap field="region" ncol={2} />
  <ThemeMinimal />
  <Labs title="Sales by category" x="Category" y="Sales" />
  <GuideLegend channel="fill" position="bottom" />
  <Legend order="sorted" />
</GGPlot>
```

Equivalent complete JSON spec:

```json complete
{
  "data": {
    "values": [
      { "cat": "a", "val": 3, "group": "g1", "region": "west" },
      { "cat": "b", "val": 5, "group": "g2", "region": "west" },
      { "cat": "a", "val": 2, "group": "g1", "region": "east" },
      { "cat": "b", "val": 4, "group": "g2", "region": "east" }
    ]
  },
  "layers": [
    {
      "geom": "col",
      "aes": {
        "x": { "field": "cat" },
        "y": { "field": "val" },
        "fill": { "field": "group" }
      }
    }
  ],
  "coord": { "type": "flip" },
  "facet": { "wrap": { "field": "region" }, "ncol": 2 },
  "theme": "minimal",
  "labs": { "title": "Sales by category", "x": "Category", "y": "Sales" },
  "guides": { "fill": { "type": "legend", "position": "bottom" } },
  "legend": { "order": "sorted" }
}
```

## Replace-vs-merge semantics (child layers)

- The `spec` prop wins over everything — when set, all other props and all
  children are ignored.
- Mark layers: the `layers` prop, when set, is used INSTEAD of geom children.
  Otherwise geom children register in document order, and registration order
  is z-order (first = bottom).
- Grammar (non-mark) families fold onto the builder AFTER the matching
  deprecated prop, in registration order — so a grammar child overrides its
  prop, and later siblings beat earlier ones.
- REPLACE families — `coord`, `facet`, `theme`: the last registration fully
  replaces earlier ones (and any matching prop). Two or more children of one
  kind emit a `DUPLICATE_PLOT_LAYER` advisory.
- Scales merge per-channel; two scale children configuring the same channel
  emit `DUPLICATE_SCALE_CHANNEL` (note British/American spellings write the
  same channel: `<ScaleColorDiscrete/>` and `<ScaleColourContinuous/>` both
  configure `color`).
- `labs`, `guides`, `legend` are keyed-MERGE families: siblings touching
  different keys all survive; a colliding key emits `DUPLICATE_MERGE_KEY` and
  the later child's value wins. The value at a key is replaced whole — a
  guide child never field-merges into another guide object for that channel.
- All three advisory codes arrive through `ondiagnostic` with severity
  `"advisory"`; the chart still renders.
- Grammar children emit no markup and are inert without a `<GGPlot>` ancestor.
