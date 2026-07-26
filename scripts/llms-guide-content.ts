/**
 * Guide section markdown — single source for docs pages AND llms surfaces.
 * Static/prose constants and the interaction reference index live here so
 * renderer and surface-builder edits do not collide with guide prose edits.
 */
import { SCALE_CAPABILITIES, TEMPORAL_PARSER_NAMES } from "@ggsvelte/spec";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../packages/svelte/src/lib/interaction/interaction";
import supportMatrix from "../support-matrix.json";
import {
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_PAGE_FILENAME,
  QUICKSTART_PAGE_SVELTE,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
} from "./quickstart";

// Guide sections (markdown; single source for docs pages AND llms surfaces)
// ---------------------------------------------------------------------------

export const GETTING_STARTED_MD = `# Getting started

ggsvelte is ggplot2's layered grammar for Svelte 5. A plot is data + an
aesthetic mapping + one or more layers, and every plot normalizes to a
PortableSpec: strict JSON, no functions, no closures. That JSON is the surface
to generate, validate, and correct against.

This page is written for code that emits specs. The human walkthrough — the
same grammar, built up one element at a time on a real dataset — is at
/guide/getting-started.

## Install

\`\`\`sh complete
bun add @ggsvelte/svelte
# or: npm install @ggsvelte/svelte
# or: pnpm add @ggsvelte/svelte
\`\`\`

\`@ggsvelte/spec\` (schema, validate, builder) and \`@ggsvelte/core\`
(pipeline, headless render, CLI) are dependencies of the Svelte package.
Install them directly for spec-only or headless work. Bundled teaching data
lives at \`@ggsvelte/svelte/data\`.

## A complete Svelte file

\`${QUICKSTART_PAGE_FILENAME}\`:

\`\`\`svelte complete
${QUICKSTART_PAGE_SVELTE}
\`\`\`

Omitted width follows the container; default height is 400px. No chart CSS is
required. During server rendering the plot uses a deterministic 640 x 400
fallback, then measures the real container after hydration; inside
\`display: none\` or a zero-width track it stays not-ready until the container
has positive width.

## The PortableSpec contract

The same chart as JSON. This is the canonical form — the Svelte component and
the TypeScript builder both normalize to it.

\`\`\`json fragment
${QUICKSTART_PORTABLE_SPEC_FRAGMENT}
\`\`\`

Rules that matter when generating specs:

- Channels are objects, never bare strings: \`{"field": "year"}\` maps a
  column, \`{"value": "#777777"}\` sets a constant, \`null\` unsets a channel
  inherited from the plot-level \`aes\`.
- Data has three forms. \`{"values": [...]}\` inlines rows; \`{"columns": {...}}\`
  is the columnar form; \`{"name": "..."}\` refers to a \`datasets\` entry.
  Inline \`values\` for data small enough to read, \`datasets\` + \`columns\`
  for anything large or shared between layers. Never truncate rows silently —
  say so, or point at the full source.
- \`layers\` is ordered bottom to top and must hold at least one layer. A layer
  may carry its own \`data\`, which then replaces the plot's for that layer.
- Stats are declarative. \`{"geom": "smooth", "params": {"method": "loess"}}\`
  fits in the pipeline; do not precompute a trend column and pass it off as
  raw data.

The full machine-readable contract is /schema/v0.json.

## The validate loop

\`validate(spec)\` checks schema shape; \`validate(spec, { profile })\` adds
data-aware checks without shipping data; \`{ lint: true }\` also returns
advisories for valid-but-questionable specs.

Every error carries a stable \`code\`, a JSON \`path\` into the spec, a
\`message\`, and a \`fix\` naming the change to make. That is the correction
loop: emit, validate, apply the fix at the path, re-emit. Do not guess, and do
not fall back to a different chart — the fix says what is wrong.

\`\`\`ts fragment
import { validate } from "@ggsvelte/spec";

const result = validate(spec);
if (!result.ok) {
  for (const error of result.errors) {
    console.error(error.code, error.path, error.fix);
  }
}
\`\`\`

The complete error catalog, with the fix for each code, is at /guide/errors;
advisories are at /guide/advisories.

## Headless rendering

No browser, no DOM. \`renderToSVGString\` is pure:

\`\`\`ts fragment
${QUICKSTART_HEADLESS_FRAGMENT}
\`\`\`

The installed CLI writes SVG to stdout and JSON Lines diagnostics to stderr,
with exit classes documented at /reference/cli:

\`\`\`sh fragment
${QUICKSTART_CLI_FRAGMENT}
\`\`\`

## Building specs in TypeScript

The fluent builder produces the same PortableSpec, with types:

\`\`\`ts fragment
${QUICKSTART_BUILDER_FRAGMENT}
\`\`\`

## Bundled data

\`@ggsvelte/svelte/data\` exports \`kyotoSakura\`: 838 peak cherry-blossom
dates for Kyoto, 812-2026 CE, with \`year\`, \`bloomDate\`, \`bloomDoy\` and
\`bloomRefDate\` (the bloom day projected onto a common non-leap year so a date
axis can draw it). The docs site serves the same rows as JSON at
/kyoto-sakura.json. Data copyright Yasuyuki Aono; cite
\`KYOTO_SAKURA_CITATION\` when publishing charts made from it.

## Grammar vocabulary

- [Data and mappings](/guide/data-mappings) — channels, constants, per-layer data
- [Layers and marks](/guide/layers-marks) — every geom and its parameters
- [Statistics and positions](/guide/statistics-positions) — stats, jitter, stacking
- [Scales and guides](/guide/scales-guides) — continuous, discrete, manual, temporal
- [Facets and coordinates](/guide/facets-coordinates) — small multiples, flip, fixed aspect
- [Themes and color](/guide/themes-color) — named themes, palettes, roles
- [Interactions](/guide/interactions) — inspect, pin, selection, zoom, linked views
- [Server rendering and export](/guide/server-rendering-export) — SSR, SVG, PNG
- [Compatibility](/guide/compatibility) — ggplot2 parity and known gaps
- [Lifecycle](/guide/lifecycle) — what is stable and what is not
`;

export const DATA_MAPPINGS_MD = `# Data and mappings

\`aes\` names which field feeds each visual channel. Source rows are not mutated.

## Map fields to position

Numeric fields to position channels:

\`\`\`svelte fragment
aes={{ x: "weight", y: "economy" }}
\`\`\`

Change the mapping without reshaping rows, or change rows without changing the
grammar. The [scatter with color example](/examples/point/scatter-color) adds a
discrete color channel on the same positions.

## Keep data local

Inline rows, named datasets, and PortableSpec data all validate and normalize
before render. The docs playground uses bounded local seeds only — no upload.
On failure it keeps the last render-confirmed chart.
`;

export const LAYERS_MARKS_MD = `# Layers and marks

Layers paint in source order. Add a mark without replacing plot data or
mappings.

## Compose layers

Line first, points on top:

\`\`\`svelte fragment
<GeomLine />
<GeomPoint />
\`\`\`

Layers inherit plot mappings unless a layer supplies its own mapping or data.
[Multi-series line](/examples/line/multi-series) uses the same pattern with a
stable discrete color scale.

## Choose a mark for the question

Points for records, lines for ordered series, columns for precomputed heights,
bars for counts, rules/text for annotation. [Examples](/examples) shows each
mark on real data.
`;

export const STATISTICS_POSITIONS_MD = `# Statistics and positions

Stats derive marks from mapped rows. Positions control how derived marks share
coordinate space.

## Statistical summaries

Fitted trend over points:

\`\`\`svelte fragment
<GeomPoint />
<GeomSmooth method="lm" />
\`\`\`

[Loess example](/examples/smooth/loess-scatter): smoother and confidence ribbon
on source points. Histogram, density, boxplot, and errorbar use the same
derive-then-render path.

For discrete x, \`stat: "summary"\` collapses each group to one summary (default
mean ± se). For continuous x, use \`stat: "summary_bin"\` instead.

## Binned y summaries (\`summary_bin\`)

\`stat: "summary_bin"\` (ggplot2 \`stat_summary_bin\`) bins continuous \`x\` with
the same break rules as \`stat_bin\`, then summarizes \`y\` in each non-empty
(group × bin). Default fun is mean ± se. Available on **point**, **line**, and
**errorbar**. Empty bins are omitted (unlike count bins).

\`\`\`svelte fragment
<GeomPoint alpha={0.35} />
<GeomErrorbar stat="summary_bin" binwidth={1} boundary={0} width={0.4} />
<GeomLine stat="summary_bin" binwidth={1} boundary={0} />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y" }))
  .geomPoint({ alpha: 0.35 })
  .geomErrorbar({ stat: "summary_bin", binwidth: 1, boundary: 0 })
  .geomLine({ stat: "summary_bin", binwidth: 1, boundary: 0 })
  .spec();
\`\`\`

Bin knobs match histogram / freqpoly: \`bins\`, \`binwidth\`, \`boundary\`,
\`center\`, \`closed\`. Summary knobs: \`fun\`, \`funMin\`, \`funMax\`.

[Binned mean ± se](/examples/errorbar/summary-bin): raw points with per-bin
errorbars and a summary line.

## Quantile regression lines

Linear quantile regression (ggplot2 \`geom_quantile\` / \`stat_quantile\`): fit
\`y ~ x\` at each conditional quantile τ and draw one line per τ (default
0.25 / 0.5 / 0.75). v1 is linear only — no rqss, no weights.

\`\`\`svelte fragment
<GeomPoint />
<GeomQuantile quantiles={[0.25, 0.5, 0.75]} />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y" }))
  .geomPoint()
  .geomQuantile({ quantiles: [0.1, 0.5, 0.9] })
  .spec();
\`\`\`

[Quantile lines](/examples/point/quantile-lines): scatter with three RQ lines.

## Contour isolines

Contour isolines (ggplot2 \`geom_contour\` / \`stat_contour\`) draw open path
polylines of constant \`z\` over a **regular** continuous \`x\` × \`y\` grid.
Levels come from \`params.breaks\`, else \`binwidth\`, else \`bins\` evenly
spaced from min(z)..max(z) inclusive (default 10). v1 is open polylines only
— no \`contour_filled\`, no irregular triangulation, no default color-by-level.

\`\`\`svelte fragment
<GeomContour bins={8} />
\`\`\`

\`\`\`ts fragment
gg(grid, aes({ x: "x", y: "y", z: "z" }))
  .geomContour({ breaks: [0.25, 0.5, 0.75] })
  .spec();
\`\`\`

Incomplete grid cells (missing/NaN corners) are skipped; groups without a
usable grid or levels are dropped with a warning. after_stat \`level\` is
carried for tooltips.

[Contour isolines](/examples/contour/basic): nested levels of a radial peak.

## 2D density isolines

Bivariate KDE isolines (ggplot2 \`geom_density_2d\` / \`stat_density_2d\`) estimate
a product Gaussian density over continuous \`x\` and \`y\`, then draw open path
polylines of constant density. Bandwidth follows MASS \`bandwidth.nrd\` then
kde2d's h/4 scaling (or \`params.h\` as one number or \`[hx, hy]\`). Grid
\`params.n\`×\`n\` (default 100) spans a 5%-expanded data range. Levels use the
same breaks / binwidth / bins rules as contour. Weights deferred.

\`\`\`svelte fragment
<GeomPoint alpha={0.5} />
<GeomDensity2d bins={5} n={40} />
\`\`\`

\`\`\`ts fragment
gg(scatter, aes({ x: "x", y: "y" }))
  .geomPoint({ alpha: 0.5 })
  .geomDensity2d({ bins: 5, n: 40 })
  .spec();
\`\`\`

Groups with fewer than two finite points are dropped with a warning.
after_stat \`level\` and \`density\` are carried for tooltips.

[2D density isolines](/examples/density/kde-2d): scatter under nested KDE
contours.

## 2D density filled bands

\`geom_density_2d_filled\` / \`stat_density_2d_filled\` reuses the same KDE grid
and draws **closed** isoline rings as filled polygons (ggplot2
\`geom_density_2d_filled\`). Open rings are dropped with
\`density-2d-filled-open-dropped\`. Fill defaults to after_stat \`level\`.

\`\`\`svelte fragment
<GeomPoint alpha={0.45} />
<GeomDensity2dFilled bins={5} n={40} alpha={0.55} />
\`\`\`

\`\`\`ts fragment
gg(scatter, aes({ x: "x", y: "y" }))
  .geomPoint({ alpha: 0.45 })
  .geomDensity2dFilled({ bins: 5, n: 40 })
  .spec();
\`\`\`

True isobands between consecutive levels and weights are deferred.

[2D density filled bands](/examples/density/kde-2d-filled): scatter under
closed KDE rings colored by level.

## Dotplot (histodot)

Histodot stacked dots (ggplot2 \`geom_dotplot\` / \`stat_bindot\`): continuous
\`x\` is binned with the same break rules as \`stat_bin\`, then **one point per
observation** is stacked in each bin. y is after_stat \`stackpos\` only (not
count). Diameter tracks binwidth in x pixels (\`dotsize\` multiplier; \`size\`
for an absolute px override). \`stackdir\`: \`up\` | \`down\` | \`center\` |
\`centerwhole\`; \`stackratio\` scales vertical spacing (default 1).

\`\`\`svelte fragment
<GeomDotplot binwidth={0.5} boundary={0} stackdir="up" />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "v" }))
  .geomDotplot({ binwidth: 0.5, boundary: 0 })
  .spec();
\`\`\`

v1 is histodot only — no Wilkinson \`dotdensity\`, no \`binaxis = "y"\`, no
weights. Mapping aes.y fails loud (\`computed-y-mapped\`).

[Dotplot histodot](/examples/dotplot/histodot): stacked points in fixed bins.
## Simple features (\`geom_sf\`)

\`geom_sf\` draws already-projected GeoJSON **Geometry** values stored as JSON
**strings** in a data column (default \`geometry\`; override with
\`params.geometry\`). Point/MultiPoint → points; LineString/MultiLineString →
open paths; Polygon/MultiPolygon → closed fills. Multipart geometries expand
to multiple marks. Interior rings are ignored with a warning; GeometryCollection
and mixed families in one layer error (split layers).

No CRS / \`coord_sf\` yet — coordinates are treated as already projected.

\`\`\`svelte fragment
<GeomSf alpha={0.9} />
\`\`\`

\`\`\`ts fragment
gg(regions, aes({ fill: "rate" })).geomSf().spec();
// geometry column holds JSON.stringify({ type: "Polygon", coordinates: [...] })
\`\`\`

[SF polygons](/examples/sf/basic): three triangles filled by a rate field.

## Ellipse confidence rings

Bivariate normal confidence ellipses (ggplot2 \`stat_ellipse\`, type \`norm\`
only) on **path** layers: per group, estimate mean and sample covariance,
scale by √χ²₂(level), and sample the perimeter (\`segments\`, default 51)
plus a closing duplicate for a closed ring.

\`\`\`svelte fragment
<GeomPoint />
<GeomPath stat="ellipse" level={0.95} segments={51} />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y", color: "g" }))
  .geomPoint()
  .geomPath({ stat: "ellipse", level: 0.95 })
  .spec();
\`\`\`

Path-only in v1 (not polygon). Groups with fewer than two finite points or
zero variance are dropped with a warning. Rejected on other geoms.

[Ellipse confidence rings](/examples/path/ellipse-rings): scatter under 95%
rings per series.

## Frequency polygon

Frequency polygon (ggplot2 \`geom_freqpoly\`) bins continuous \`x\` and draws a
line through bin centers (y defaults to count). Canonical form is \`line\` +
\`stat: "bin"\` + position identity — not a separate mark type:

\`\`\`svelte fragment
<GeomFreqpoly bins={30} />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "v", color: "g" })).geomFreqpoly({ bins: 30 }).spec();
// → { geom: "line", stat: "bin", position: "identity", y: { stat: "count" } }
\`\`\`

[Frequency polygon](/examples/freqpoly/basic): Michelson light-speed runs as a
line through bin centers (companion to the histogram specimen).

## Unique (first-wins aesthetic dedupe)

\`stat: "unique"\` drops duplicate rows on the combination of mapped aesthetic
fields before drawing — first occurrence wins, panel-local (ggplot2
\`stat_unique\`). Available on identity-capable geoms (point, line, path, text,
col, area, rect, ribbon, rule, segment, errorbar).

\`\`\`svelte fragment
<GeomPoint stat="unique" />
\`\`\`

[stat unique overplotting](/examples/point/stat-unique): stacked identical
\`(x, y, series)\` triples collapse to one mark.

## Manual (portable named per-group transforms)

\`stat: "manual"\` (ggplot2 \`stat_manual\`, portable v1) applies a **named**
per-group transform — no JS callbacks (PortableSpec only). Required
\`params.fun\`:

| fun | Behavior |
|-----|----------|
| \`first\` / \`last\` | Keep one source row per aesthetic group |
| \`mean\` / \`median\` / \`min\` / \`max\` / \`sum\` | One synthetic row; x and y aggregated independently |

Surfaces: **point**, **line**, **path**. Missing \`fun\` fails with
\`manual-fun-required\`; unknown names are schema \`invalid-enum-value\`.

\`\`\`svelte fragment
<GeomPoint stat="manual" fun="mean" />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y", color: "g" }))
  .geomPoint({ stat: "manual", fun: "mean" })
  .spec();
\`\`\`

[stat manual mean centroids](/examples/point/stat-manual-mean): identity
scatter under large mean points per series.

## Align (shared continuous-x grid for stack)

\`stat: "align"\` (ggplot2 \`stat_align\`) is for continuous-x \`area\` / \`line\`
when series sample different x values. It unions finite x across groups,
linearly interpolates each series onto that shared grid, and sets y to 0
outside a group's observed x range so \`position: "stack"\` / \`"fill"\` can
compose without jagged seams.

\`\`\`ts fragment
gg(data, aes({ x: "t", y: "v", fill: "series" }))
  .geomArea({ stat: "align", position: "stack" })
  .spec();
\`\`\`

\`\`\`svelte fragment
<GeomArea stat="align" position="stack" />
\`\`\`

Available on **area** and **line** only (not point or shared identity-only
geoms). Outside a group's x span y is 0 (stack-friendly).

## Connect (named path joins)

\`stat: "connect"\` (ggplot2 \`stat_connect\`) expands successive finite points
into intermediate vertices so stepped joins are real path geometry — not only
a stroke curve flag. \`params.connection\`: \`hv\` (default), \`vh\`, \`mid\`,
\`linear\`. On **path** expansion is in data order; on **line** points are sorted
by x first, and geometry skips a second x-sort so tied-x elbows stay intact.

\`\`\`svelte fragment
<GeomPath stat="connect" connection="hv" />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y" }))
  .geomPath({ stat: "connect", connection: "hv" })
  .spec();
\`\`\`

[Connect hv path](/examples/path/connect-hv): three data points expand to a
horizontal-then-vertical polyline.

## Curve connectors

Curved connectors (ggplot2 \`geom_curve\`): one quadratic Bezier per row from
\`(x,y)\` to \`(xend,yend)\`, tessellated in **panel px** so curvature is not
aspect-skewed. Params: \`curvature\` (default 0.5), \`angle\` (degrees, default
90), \`ncp\` (control-point density). Same required channels as segment;
\`lineend\` maps to SVG stroke-linecap (default butt).

\`\`\`svelte fragment
<GeomCurve curvature={0.4} lineend="round" />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y", xend: "xend", yend: "yend" }))
  .geomCurve({ curvature: 0.5, angle: 90, ncp: 5 })
  .spec();
\`\`\`

Intentional subset: quadratic approximation, not full grid xspline.
[Curve connectors](/examples/curve/connectors): Darwin maize pairs as arcs.

## Map (fortified choropleth)

\`geom: "map"\` (ggplot2 \`geom_map\`) joins a **fortified map table** to value
rows. Map coordinates come from \`long\`+\`lat\` or \`x\`+\`y\`; the join key is
\`aes.map_id\` on the value table matched to \`params.mapId\` on the map
(default \`"region"\`, then \`"id"\`). Optional map \`group\` splits multipoly
rings. Missing regions drop with a \`map-region-missing\` warning.

\`\`\`svelte fragment
<GeomMap map={{ values: fortified }} linewidth={1.2} />
\`\`\`

\`\`\`ts fragment
gg(rates, aes({ map_id: "region", fill: "rate" }))
  .geomMap({ map: { values: fortified }, mapId: "region" })
  .spec();
\`\`\`

Intentional subset: no network map fetches, no sf/CRS, no public
\`geom_polygon\` (map ships the closed-path renderer only).
[Map choropleth](/examples/map/choropleth): three toy regions filled by rate.

## Positions

Stack sums, dodge side-by-side groups, fill normalizes each stack to one, jitter
separates overlaps with a deterministic seed. [Bar examples](/examples?category=bar).
`;

export const SCALES_GUIDES_MD = `# Scales and guides

A scale translates semantic data values into a visual position or color. A
position transform runs before statistics; an axis explains the trained scale
without changing its meaning.

## Continuous position scales

Numeric x and y fields use a continuous linear scale by default. Non-temporal
continuous scales reserve 5% multiplicative display expansion at both ends.
Expansion affects only display training, never filtering or statistics. Restore
flush bounds with \`expand: { mult: 0, add: 0 }\`.

Use the closed \`identity\`, \`log10\`, and \`sqrt\` transforms. The scale family
stays \`linear\`: GuidePlan and RenderModel report \`type/scaleType: "linear"\`
plus the transform. Authored \`type: "log"\` remains an accepted alias and
canonicalizes to \`{ type: "linear", transform: "log10" }\`.

\`\`\`json fragment
{
  "scales": {
    "x": { "type": "linear", "transform": "log10" },
    "y": { "type": "linear", "transform": "sqrt", "reverse": true }
  }
}
\`\`\`

Builder helpers and their ggplot2 aliases produce the same canonical spec:

\`\`\`ts fragment
import {
  scaleXLog10,
  scaleYSqrt,
  scale_x_log10,
  scaleColorGradient,
  scale_color_gradient2,
  scale_fill_gradientn,
} from "@ggsvelte/spec";

const camel = scaleXLog10({ domain: [1, 10_000] });
const alias = scale_x_log10({ limits: [1, 10_000] });
const root = scaleYSqrt({ reverse: true });
// Continuous colour gradients (#826): map to sequential scales with explicit range.
const twoStop = scaleColorGradient({ low: "#132B43", high: "#56B1F7" });
const diverging = scale_color_gradient2({ low: "#B2182B", mid: "#F7F7F7", high: "#2166AC" });
const nStop = scale_fill_gradientn({ colours: ["#440154", "#21918c", "#fde725"] });
\`\`\`

Svelte shells: \`<ScaleColorGradient>\`, \`<ScaleColorGradient2>\`,
\`<ScaleColorGradientn>\` (and fill / colour aliases). gradientn requires ≥2
hex stops via \`colours\` / \`colors\` / \`values\`. See
[gradient colour example](/examples/point/gradient-continuous).

The Svelte surface accepts the same JSON and re-exports the same helpers:

\`\`\`svelte fragment
<GGPlot data={rows} aes={{ x: "latency", y: "requests" }}>
  <Scale
    value={{
      x: { type: "linear", transform: "log10" },
      y: { type: "linear", transform: "sqrt" },
    }}
  />
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

The smooth receives transformed x and y. This is intentionally different from
a post-stat coordinate transform: scale transformation can change a fit,
histogram, density estimate, summary, or boxplot.

## Limits, missing values, and OOB policy

\`domain\` and helper \`limits\` pin an unexpanded interval in semantic source
units. Supplying both to a helper is an error. The default \`oob: "censor"\`
replaces out-of-limit values with missing before stats; \`oob: "squish"\`
clamps them to the nearest limit first. \`naValue\` replaces missing/censored
positions before transform-domain validation.

Log10 requires positive values and sqrt requires non-negative values. Recovery
is explicit: filter or repair the data, select identity, widen limits, or choose
the intended OOB policy. See
[scale-transform-domain](/guide/errors#scale-transform-domain),
[scale-oob-censored](/guide/errors#scale-oob-censored), and
[scale-oob-squished](/guide/errors#scale-oob-squished).

## Binned positions

A binned scale assigns quantitative values to bounded transformed-space bins
while preserving source values for tooltips and events:

\`\`\`svelte fragment
<Scale
  value={{
    x: {
      type: "binned",
      transform: "log10",
      breaks: [1, 10, 100, 1000],
    },
  }}
/>
\`\`\`

The runtime keeps integer bin identities private for count/stack/fill/dodge.
Geometry, jitter, guides, and synthesized candidates use transformed centers
and semantic inverse values. Explicit or automatic bins are right-closed with
an inclusive lowest edge and are capped at 64.

## Breaks and labels

\`breaks\` and \`minorBreaks\` are bounded semantic source values. Major breaks
win when a major and minor coincide. Explicit breaks outside the trained domain
are omitted with
[scale-break-outside-domain](/guide/errors#scale-break-outside-domain).
Temporal \`dateMinorBreaks\` outranks generic \`minorBreaks\`.

\`reverse\` changes the pixel direction but not semantic tick order. \`nice\`
controls numeric domain rounding. Guides retain complete semantic values and
apply the forward transform exactly once.

## Categorical color

Use a named categorical scheme when color identifies groups:

\`\`\`svelte fragment
<GGPlot data={cars} aes={{ x: "weight", y: "economy", color: "vehicleClass" }}>
  <Scale value={{ color: { type: "ordinal", scheme: "observable10" } }} />
  <GeomPoint />
</GGPlot>
\`\`\`

Stable assignments preserve category identity as rows filter or reorder. See
registered schemes and capacities on
[Themes and color](/themes). Palette exhaustion is
\`onExhaust: "cycle"\` (default, warn once) or \`"error"\` — diagnostics at
[palette-exhausted](/guide/errors#palette-exhausted) and
[palette-exhausted — warning](/guide/errors#palette-exhausted-warning).

ggplot2-shaped discrete helpers (portable named schemes, not bake-only):

\`\`\`svelte fragment
<ScaleColorHue />
<!-- or: <ScaleColorGrey />, <ScaleColorOrdinal scheme="tableau10" /> -->
\`\`\`

\`\`\`ts fragment
import { scaleColorHue, scaleColorGrey, scaleColorOrdinal } from "@ggsvelte/spec";

scaleColorHue(); // { color: { type: "ordinal", scheme: "hue" } }
scaleColorGrey(); // scheme "grey" (US gray is a binding-identical alias)
scaleColorOrdinal({ scheme: "tableau10" }); // alias of scaleColorDiscrete
// Custom h/c/l (hue) or start/end (grey) bake a fixed 10-stop range instead.
\`\`\`

[Hue discrete colour](/examples/point/hue-discrete): even-hue groups via
\`scale_color_hue\`. Registered schemes also include \`"grey"\` / \`"gray"\`.

## Continuous, binned, manual, and identity color

Quantitative color/fill defaults to a continuous viridis colorbar. The
\`identity\`, \`log10\`, and \`sqrt\` transforms run before color-domain training;
they do not change position statistics. Explicit reference \`breaks\` stay in
semantic source units.

\`\`\`ts fragment
import {
  scaleColorLog10,
  scaleFillContinuous,
} from "@ggsvelte/spec";

const color = scaleColorLog10({ domain: [1, 1000] });
const fill = scaleFillContinuous({ scheme: "viridis" });
\`\`\`

Binned color/fill uses deterministic \`[lower, upper)\` intervals with the final
upper edge included. At most 65 boundaries (64 steps) are portable. A
colorsteps guide exposes every boundary, label, swatch, and inclusivity rule:

\`\`\`svelte fragment
<GGPlot data={rows} aes={{ x: "hour", y: "pm25", color: "pm25" }}>
  <Scale
    value={scaleColorBinned({
      breaks: [0, 12, 35, 55, 100],
      range: ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
    })}
  />
  <GeomPoint />
</GGPlot>
\`\`\`

Manual scales pair each domain value with exactly one color and never recycle
unknown values. Identity scales validate source \`#rgb\`/\`#rrggbb\` values and
show no guide by default. \`naValue\` handles missing values; \`unknownValue\`
handles invalid, unmapped, or censored values. Multi-aesthetic helpers expand
the same identity or manual config across channels (British \`colour\` aliases
\`color\`):

\`\`\`ts fragment
import {
  scaleContinuousIdentity,
  scaleDiscreteManual,
  scaleType,
} from "@ggsvelte/spec";

const linked = scaleDiscreteManual({
  aesthetics: ["colour", "fill"],
  values: ["#4477aa", "#ee6677"],
  domain: ["control", "treated"],
});
const rawSize = scaleContinuousIdentity({ aesthetics: ["size", "alpha"] });
// Agent default: scaleType({ aesthetic: "color", dataKind: "nominal" }) → "ordinal"
\`\`\`

\`\`\`ts fragment
const manual = scaleColorManual({
  domain: ["control", "treated"],
  values: ["#4477aa", "#ee6677"],
  unknownValue: "#999999",
});
const identity = scaleFillIdentity({ naValue: "#cccccc" });
\`\`\`

Color and colour spellings are binding-identical exports, including
\`scaleColorBinned\`, \`scaleColourBinned\`, \`scale_color_binned\`, and
\`scale_colour_binned\`. Fill exports use the same families. Date/datetime
helpers reuse the strict parser registry and semantic epoch representation:
\`scaleColorDate\`, \`scaleColorDatetime\`, \`scaleFillDate\`, and
\`scaleFillDatetime\`.

Open [continuous color](/examples/color/continuous) for a colorbar and
[binned color](/examples/color/binned) for colorsteps.

## Size, linewidth, alpha, shape, and linetype

The remaining visual channels use the same stable scale contract. Quantitative
\`size\`, \`linewidth\`, and \`alpha\` default to sequential scales; categorical
values default to ordinal scales. Size interpolation is perceptually linear in
symbol area. Alpha is bounded to 0–1, while size and linewidth must stay
positive.

\`\`\`ts fragment
import {
  scaleSizeContinuous,
  scaleLinewidthBinned,
  scaleAlphaDate,
  scaleShapeManual,
  scaleLinetypeDiscrete,
} from "@ggsvelte/spec";

const scales = {
  ...scaleSizeContinuous({ range: [2, 10] }),
  ...scaleLinewidthBinned({ breaks: [0, 10, 20, 50] }),
  ...scaleShapeManual({
    domain: ["control", "treated"],
    values: ["circle", "triangle"],
  }),
  ...scaleLinetypeDiscrete(),
};
\`\`\`

Shape and linetype are finite perceptual sets. Continuous values therefore
require an explicit \`binned\` scale; they are never silently interpolated.
Manual scales require one output per domain value, and exhaustion errors by
default unless \`onExhaust: "cycle"\` is explicitly selected. Identity scales
validate literal outputs and suppress guides.

Discrete and binned style mappings participate in grouping; continuous numeric
styles do not. Mapped values survive stats, positions, SVG/Canvas rendering,
server rendering, inspection, legend focus/filtering, and hit testing. Literal
constants remain unscaled unless authored as \`{ value, scale: true }\`.
Missing and invalid values use distinct \`naValue\` and \`unknownValue\` outputs.
Date/datetime helpers reuse the strict parser and timezone semantics used by
position and color scales.

Open [complete style scales](/examples/point/style-scales) for the runnable
five-channel contract.

## Responsive guide presentation

Guide appearance is downstream of scale training. Author top-level \`guides\`,
a scale-local \`guide\`, or fluent \`.guides()\` with \`guideAxis\`,
\`guideLegend\`, \`guideColorbar\`, \`guideColorsteps\`, and \`guideNone\`.
Top-level entries win over scale-local entries.

\`\`\`ts fragment
import { guideAxis, guideColorsteps } from "@ggsvelte/spec";

const guides = {
  x: guideAxis({ title: "Hour", showTicks: false }),
  color: guideColorsteps({ position: "bottom", direction: "horizontal" }),
};
\`\`\`

In Svelte that object is a \`<Guides>\` child:

\`\`\`svelte fragment
<GGPlot data={rows} aes={{ x: "hour", y: "pm25", color: "pm25" }}>
  <Guides value={guides} />
  <GeomPoint />
</GGPlot>
\`\`\`

Automatic legends stay right only when the viewport is wider than 480px and at
least 320px of readable panel remains; otherwise they move below. Bottom keys
wrap without shrinking type and bottom ramps are horizontal. Discrete guides
merge only across exact semantic and presentation identities. Exact raw-value
entries stay interactive after merging; numeric ticks and bins do not become
filter targets. Identity/manual guides with fewer than two entries remain
hidden unless \`force: true\` is explicit.

## Date and time axes

Declare a time scale for ISO 8601 values and let the scale choose UTC calendar
ticks. Time axes preserve temporal parsing and expansion behavior and always
use the identity position transform. Pin breaks or labels only when the
audience needs a fixed convention. The
[time-axis example](/examples/line/time-axis) is the runnable contract.
`;

export const FACETS_COORDINATES_MD = `# Facets and coordinates

Facets partition rows into panels before panel stats. Coordinates present
trained scales (flip, etc.) without rewriting aesthetic mappings.

## Facet a comparison

One grammar, one panel per group:

\`\`\`svelte fragment
<GGPlot data={cars} aes={{ x: "weight", y: "economy" }}>
  <FacetWrap field="vehicleClass" ncol={2} />
  <GeomPoint />
</GGPlot>
\`\`\`

Fixed scales: compare magnitudes across panels. Free scales: within-panel shape
at the cost of cross-panel magnitude. [facet wrap](/examples/facet/wrap),
[free-y](/examples/facet/wrap-free-y).

## Coordinates

Prefer \`coord flip\` for horizontal bars over swapping x/y semantics.
[Horizontal bar](/examples/bar/horizontal) keeps category on x, value on y, then
flips presentation.

## Scale transforms versus coordinate transforms

A scale transform changes the values consumed by statistics and positions. A
coordinate transform leaves those computations alone and projects the final
geometry:

\`\`\`ts fragment
// The linear fit consumes log10(exposure).
gg(rows, aes({ x: "exposure", y: "response" }))
  .geomSmooth({ method: "lm" })
  .scaleXLog10();

// The fit consumes exposure; only its rendered geometry is curved.
gg(rows, aes({ x: "exposure", y: "response" }))
  .geomSmooth({ method: "lm" })
  .coordTransform({ x: "log10" });
\`\`\`

The portable JSON form is strict and callback-free:

\`\`\`json complete
{
  "type": "transform",
  "x": {
    "transform": "log10",
    "limits": [1, 1000],
    "reverse": false,
    "expand": false
  },
  "clip": true
}
\`\`\`

Use \`coordTransform\` or its identical ggplot2-style alias
\`coord_transform\`. In Svelte it is a \`<CoordTransform>\` child, which takes
the same options (\`<Coord value={coordTransform({ … })} />\` is the escape
hatch for a coordinate computed elsewhere):

\`\`\`svelte fragment
<GGPlot data={rows} aes={{ x: "exposure", y: "response" }}>
  <CoordTransform x="log10" y="sqrt" />
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

Coordinate limits create a post-stat viewport: they do not censor rows or
recompute a fit. Coordinate inversion runs before scale inversion, so tooltip,
interval, and brush-zoom values remain semantic. Nonlinear lines, smooths,
areas, smooth confidence bands, and segments use bounded adaptive tessellation;
synthetic render vertices never become inspectable data. Set \`clip: false\`
only for intentional panel overflow.

## Preserve physical data-unit ratios

Use \`coordFixed()\` when equal data units must have equal physical lengths. The
layout reserves titles, axes, and responsive guides first, then centers the
largest exact-ratio data rectangle in the remaining allocation. Panel fill,
grids, marks, clipping, axes, and facet strips occupy only that rectangle;
letterbox gutters use the theme paper role by default.

\`\`\`ts fragment
gg(rows, aes({ x: "x", y: "y" }))
  .geomLine()
  .coordFixed({ ratio: 1 });
\`\`\`

\`ratio\` is physical y-unit length divided by physical x-unit length. The
camelCase helper, builder \`.coordFixed()\`, \`coord_fixed\`, \`coordEqual\`, and
\`coord_equal\` all emit the same strict JSON. Free positional facet scales are
rejected with \`coord-fixed-free-scales\`; use fixed facet scales when panels must
share one physical comparison. On an unusually constrained container the ratio
is never stretched: minor furniture is removed, the SVG declares
\`data-gg-layout="degraded"\`, and authors receive one \`coord-fixed-degraded\`
warning. See the runnable [fixed-aspect example](/examples/point/fixed-aspect).

Non-identity coordinate transforms reject band and temporal axes with
\`coord-transform-continuous\` or \`coord-transform-temporal\`. Domains that
cross log10/sqrt boundaries fail with \`coord-transform-domain\` and exact
recovery guidance. Open the runnable **Post-stat coordinate transform** sample
in the [Playground](/playground).
`;

export const THEMES_COLOR_MD = `# Themes and color

Theme: paper, ink, grid, type, interaction roles. Scales: data color. Site
appearance is independent unless follow mode is explicit.

## Choose a chart theme

Registered theme name; mappings unchanged:

\`\`\`svelte fragment
<GGPlot data={rows} aes={{ x: "year", y: "value" }}>
  <ThemeEconomist />
  <GeomLine />
</GGPlot>
\`\`\`

Eighteen registered theme names (sixteen distinct looks), categorical palettes,
and sequential ramps: [Themes and color](/themes). \`theme: "bw"\` /
\`<ThemeBw />\` is a white-panel print theme (grey grid + rectangular border).
\`theme: "linedraw"\` / \`<ThemeLinedraw />\` is monochrome line-art chrome
(black hairline grid and panel border). \`theme: "void"\` / \`<ThemeVoid />\`
suppresses axes, grid, and panel chrome (marks and legends remain) for maps,
logos, and free-form composition (ggplot2 \`theme_void\`). UK
\`theme: "grey"\` / \`<ThemeGrey />\` and US \`theme: "gray"\` / \`<ThemeGray />\`
are first-class aliases of the ggplot2 grey-panel look (\`ThemeGgplot2\` /
\`theme: "ggplot2"\`), matching ggplot2 \`theme_grey\` / \`theme_gray\`.
\`theme: "test"\` / \`<ThemeTest />\` is a pinned high-contrast snapshot theme
for package tests and VR (ggplot2 \`theme_test\` role; not an alias of product
themes). Exhaustion: [palette-exhausted](/guide/errors#palette-exhausted).

## Preserve color meaning

Explicit range beats named scheme beats edition default. Changing theme must
not reassign categorical colors or reverse a sequential ramp.
`;

export const INSPECT_PIN_MD = `# Inspect and pin

Chart-local: semantic crosshair, HTML tooltip, keyboard traversal, optional pin.

## Inspect and pin

Stable row key + inspect:

\`\`\`svelte fragment
<GGPlot
  key="id"
  inspect={{ mode: "exact", pin: true }}
/>
\`\`\`

Pointer, touch, and keyboard report the same semantic datum. Enter/Space pins;
Escape dismisses. [Inspection example](/examples/interaction/tooltip).

## Keep ownership honest

Tooltip, crosshair, active tool, and pin stay private to one chart. Share a
controller only for selection, emphasis, intervals, or zoom domains that other
UI also needs.
`;

export const SELECTION_ZOOM_MD = `# Selection and zoom

Selection: semantic identities. Zoom: visible domains. Separate tools so
gestures do not fight inspection or page scroll.

## Select points

Stable keys; events carry semantic identities, not renderer indices.

\`\`\`svelte fragment
<GGPlot key="id" select={{ type: "point", multiple: true }} />
\`\`\`

## Select an area and zoom

Interval selection and brush zoom are separate tools with domain bounds, clear
paths, and keyboard-editable bounds.
[Selection and zoom](/interactions/brush-zoom).
`;

export const LINKED_VIEWS_MD = `# Linked views

Share selection, emphasis, intervals, or domains across plots, controls, or
tables via \`createPlotInteraction\`.

## Create a shared controller

\`\`\`svelte fragment
const interaction = createPlotInteraction<string>();
const scope = { keys: "record-id", x: "weight", y: "economy" } as const;
\`\`\`

Same controller + scope on every consumer. Passive plots render without re-emitting.
[Linked views](/interactions/linked-views): two plots, buttons, table.

## Keep local state local

Inspection, tooltip, crosshair, active tool, and interval drafts stay chart-local.
Share committed semantic state, not pixels or UI mode.
`;

export const ACCESSIBILITY_MD = `# Accessibility

Accessible name, keyboard/touch paths, visible focus, live announcements, and
a data-detail alternative when marks are dense.

## Name the chart

\`\`\`svelte fragment
<GGPlot ariaLabel="Fuel economy decreases as vehicle weight increases" />
\`\`\`

Subject or takeaway — not generic image alt, not a substitute for a caption.

## Keyboard and touch

Focus the chart; arrows/brackets traverse. Enter/Space pins or commits the
active tool; Escape dismisses. Touch pins rather than relying on hover.
[Inspection example](/examples/interaction/tooltip): pinned content in labelled DOM.

## Dense charts

Canvas marks keep SVG axes/legends and the accessible description/table path.
Forced colors keeps controls and focus when system colors replace chart paint.
`;

export const RESPONSIVE_CHARTS_MD = `# Responsive charts

Omit width: GGPlot observes its container. Positive-width block, no chart CSS.
Omitted height: 400px default.

## Container width

Collapsed parent, hidden tab, or zero-width track → not-ready until
ResizeObserver reports positive width. Do not paper over that with a fake fixed
width. [Troubleshooting](/guide/errors#quickstart-troubleshooting).

## Server fallback and hydration

SSR: 640×400 deterministic fallback, not-ready in HTML, measure after hydration.
Reserve layout space to avoid CLS.
`;

export const RENDERING_PERFORMANCE_MD = `# Rendering and performance

Renderer follows mark density and interaction needs. Axes, legends, labels, and
a11y chrome stay semantic regardless of SVG vs canvas.

## SVG, canvas, and auto

SVG: DOM marks. Canvas: dense strata. Auto: switches above the published
threshold and emits \`canvas-auto\`. [10k-point scatter](/examples/point/canvas-scatter):
canvas marks, SVG axes/legend.

## Canvas and interaction

Inspection and selection use the model-owned candidate store, not DOM hit tests.
Stable keys keep identity across SVG/canvas; renderer indices never appear in
public callbacks.

## Measure before overriding

Use repo performance fixtures and advisories. Do not pick canvas from screenshot
timing alone, or force global canvas that drops useful SVG detail.
`;

export const SERVER_RENDERING_EXPORT_MD = `# Server rendering and export

Three paths, one PortableSpec: Svelte SSR, pure \`renderToSVGString\`, CLI.

## Server rendering

Same deterministic layout fallback as the responsive component. Measurement and
interaction attach after hydration.

## Pure SVG export

\`\`\`ts fragment
import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 640, height: 400 });
\`\`\`

No DOM. Complete SVG string.

## Command-line export

\`\`\`sh fragment
ggsvelte-render spec.json > chart.svg
\`\`\`

SVG on stdout; JSON Lines diagnostics on stderr. [CLI reference](/reference/cli).
`;

export const TEMPORAL_SCALES_MD = `# Dates without preprocessing

ggsvelte infers strict ISO dates/date-times, four-digit year strings,
year-months, month-years, year-quarters, and runtime \`Date\` values from data.
Classification inspects at most the first and last 32 non-null values; after it
selects one parser family, every non-null value must validate. A partially valid
column never becomes partially temporal.

## Let the default work

\`"1835"\`, \`"1900"\`, and \`"2026"\` are spaced as calendar years, not as
three equally spaced categories. Numeric \`1835\` stays quantitative.

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomLine } from "@ggsvelte/svelte";
  const rows = [
    { year: "1835", value: 12 },
    { year: "1900", value: 19 },
    { year: "2026", value: 31 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "year", y: "value" }} width="container" height={360}>
  <GeomLine />
</GGPlot>
\`\`\`

## Inspect the choice

Read \`model.scaleDecisions\` in \`onrender\` for field, parser, precision,
bounded evidence, validated count, trained domain, ambiguity, and a portable
override. Exceptional or advisory choices also appear in
\`model.scaleDiagnostics\` as stable problem/cause/fix records. The responsive
axis decisions live in \`model.guidePlans\`: each drawn panel axis reports its
calendar interval, visible and complete labels, major/minor tier, locale,
timezone, overlap state, and stable ID. \`ScaleDecision.guidePlanIds\` links
inference to those panel plans without copying facet-specific arrays.

## Responsive calendar labels

Automatic temporal axes score calendar-aligned candidates from milliseconds to
centuries against the actual panel extent and measured label widths. They prefer
3–7 major labels, but no-overlap wins. Month, quarter, year, week, and day
stepping follows civil boundaries rather than average milliseconds. The planner
runs inside the existing two layout passes and may move only to a coarser
interval during pass B.

Default date labels keep UTC calendar meaning. Datetime labels use the configured
IANA timezone. The deterministic defaults are \`en-US\`, UTC, and Monday week
starts. Visible labels may suppress repeated context; every SVG major tick keeps
a complete standalone label in its \`<title>\`.

Use exact portable controls when the default is not the editorial choice:

\`\`\`ts fragment
const spec = gg(rows, aes({ x: "when", y: "value" }))
  .geomLine()
  .scaleXDatetime({
    dateBreaks: "2 weeks",
    dateMinorBreaks: "1 day",
    dateLabels: "%e %b",
    locale: "en-GB",
    timezone: "Europe/London",
    weekStart: "monday",
  })
  .spec();
\`\`\`

Canonical JSON uses the same fields. Interval strings are a positive integer plus
\`millisecond\`, \`second\`, \`minute\`, \`hour\`, \`day\`, \`week\`, \`month\`,
\`quarter\`, or \`year\` (singular or plural). Explicit \`breaks\` outrank
\`dateBreaks\`; \`dateLabels\` outranks the older soft-fallback \`labels\` field.
Authored breaks and labels are never silently thinned, rotated, or truncated.
If they cannot fit, the render keeps them and emits a structured scale
diagnostic with a coarser-interval or wider-layout fix.

## Override one choice

Ambiguous values such as \`03/04/2024\` stay discrete. Pick the intended order:

\`\`\`ts fragment
const spec = gg(rows, aes({ x: "when", y: "value" }))
  .geomLine()
  .scaleXDate({ parse: "dmy" })
  .spec();
\`\`\`

Canonical JSON uses \`scales: { x: { type: "time", parse: "dmy" } }\`.
The closed parser names are generated from the runtime registry:
\`${TEMPORAL_PARSER_NAMES.join("`, `")}\`. Exact bounded formats and epoch
seconds/milliseconds are object parser forms. Timezone-less values mean UTC;
IANA zones use Temporal with explicit DST disambiguation.

If four-digit strings are identifiers, force categories with
\`.scaleXDiscrete()\`, \`scale_x_discrete()\`, or
\`scales: { x: { type: "band" } }\`.

## PortableSpec boundary

PortableSpec remains strict JSON: no \`Date\`, callback, or regular expression.
The checked capability ledger records the temporal family as
\`${SCALE_CAPABILITIES.find((capability) => capability.family === "position-temporal")?.runtime ?? "missing"}\`; docs, helper tests, and agent checks consume that ledger.
Builder and Svelte authoring may contain runtime Dates; they canonicalize to ISO
before validation. The standalone \`ymd\`, \`mdy\`, \`dmy\`, related order and
timestamp helpers, exact-format parser, and epoch helpers return authoring Dates.
`;

export const COMPATIBILITY_MD = `# Compatibility

Every release is tested as an installed package: clean install, strict
type-check, client build, server render, pure Node render, and the
\`ggsvelte-render\` CLI.

- Node.js \`${supportMatrix.node.range}\` (${supportMatrix.node.tested.join(" and ")} in CI; ${supportMatrix.node.canary} nightly)
- Svelte \`${supportMatrix.svelte.range}\` (tested floor ${supportMatrix.svelte.minimum}, current ${supportMatrix.svelte.current})
- npm ${supportMatrix.packageManagers.npm}, pnpm ${supportMatrix.packageManagers.pnpm}, Bun ${supportMatrix.packageManagers.bun}
- Chromium, Firefox, and WebKit (Playwright ${supportMatrix.browsers.playwright})
- Ubuntu and Windows in CI; macOS nightly

Exact machine-checked rows live in
[support-matrix.json](https://github.com/ljodea/ggsvelte/blob/main/support-matrix.json).
Bun is the contributor toolchain only; consumers can use any installer above.
`;

export const INTERACTIONS_MD = `# Interactions

Static by default. Opt in with \`inspect\`, \`select\`, \`zoom\`, \`legendFocus\`,
\`legendFilter\`. With more than one draw tool, an accessible tool rail keeps
gestures from competing.

Without a controller, state is private to one chart and callbacks report
changes. Pass \`createPlotInteraction()\` when plots, controls, or tables share
semantic state (required, stable semantic scope via \`interactionScope\`).

Examples: [inspect](/examples/interactions/inspection),
[interval/zoom](/examples/interactions/interval-selection),
[linked views](/interactions/linked-views),
[legend focus](/examples/interaction/legend-focus),
[legend filter](/examples/interaction/legend-filter),
[facet intervals](/interactions/facet-intervals),
[playground](/playground).
Contracts: [interaction reference](/guide/interaction-reference).

## Inspection

\`inspect={true}\` enables the default HTML tooltip, semantic crosshair,
keyboard traversal, and click-or-Enter pinning. Configure it when the chart
has a natural comparison axis:

\`\`\`svelte fragment
<GGPlot
  {data}
  aes={{ x: "date", y: "value", color: "series" }}
  key="id"
  inspect={{ mode: "x", pin: true, maxDistance: 24 }}
  oninspect={(event) => console.log(event)}
>
  <GeomLine />
  <GeomPoint />
</GGPlot>
\`\`\`

The modes are \`auto\`, \`exact\`, \`x\`, \`y\`, and \`xy\`. \`auto\` resolves to a
concrete mode before an event is emitted. \`x\` and \`y\` return one
representative per semantic series at the focused axis value; \`exact\` and
\`xy\` return the focused datum. \`maxDistance\` is measured in CSS pixels: the
dominant axis for \`x\` or \`y\`, Euclidean distance for \`xy\`, and geometry
containment plus tolerance for \`exact\`. Rect marks (\`geom_col\` / \`geom_bar\`)
never draw a point ring; default hover is tooltip-only. Pass
\`muteSiblings: true\` to mute non-focused bars via the interaction mask.

For custom HTML, pass a Svelte 5 snippet. Informational content is the default;
choose \`contentMode: "interactive"\` only when the pinned tooltip contains
controls that need focus.

\`\`\`svelte fragment
{#snippet details(inspection)}
  <strong>{inspection.focus.row?.name}</strong>
  <span>{inspection.members.length} series at this value</span>
{/snippet}

<GGPlot inspect={{ mode: "x", content: details }} />
\`\`\`

## Point and interval selection

Point selection is durable identity, not a renderer index. Supply a unique,
stable string, number, or symbol for every source row:

\`\`\`svelte fragment
<GGPlot
  key="id"
  select={{ type: "point", multiple: true }}
  onselect={(event) => {
    if (event.mode === "point") selectedKeys = event.keys;
  }}
/>
\`\`\`

Use interval selection for brushing. The callback receives both the selected
domain and normalized plot-pixel rectangle, plus semantic keys and a lineage
count for aggregate marks.

\`\`\`svelte fragment
<GGPlot
  key="id"
  select={{ type: "interval", mode: "xy", persistent: true }}
  onselect={(event) => {
    if (event.mode !== "point" && event.phase === "end") {
      selectedDomain = event.domain;
    }
  }}
/>
\`\`\`

Faceted intervals use stable field-and-value panel identities rather than panel
indices. Choose a preset for the relationship between panels:

- \`independent\` (default) replaces the interval in only the origin panel.
- \`union\` keeps independently drawn panel intervals and combines their keys.
- \`cross-panel\` projects one semantic domain through every compatible panel.

\`cross-panel\` intersects the interval with each panel's domain when facet
scales are free; a disjoint panel selects nothing instead of clamping to an
unrelated edge. Panel identity survives row reordering and temporary absence.
See the [runnable facet example](/interactions/facet-intervals).

## Shared controlled state

\`createPlotInteraction<Key>()\` owns selection, emphasis, and continuous zoom
domains outside any chart. Give linked consumers the same controller and a
required, stable semantic scope via \`interactionScope\`. A transition is
published once by its origin; passive charts render the new snapshot without
emitting the callback again. Controlled plots never infer channel names: add an
\`x\` and/or \`y\` scope whenever controlled zoom uses that channel.

\`\`\`svelte fragment
<script lang="ts">
  import { createPlotInteraction } from "@ggsvelte/svelte";

  const interaction = createPlotInteraction<string>();
  const scope = { keys: "penguin-id", x: "flipper-mm", y: "mass-g" } as const;
  const selected = $derived(interaction.selected(scope));
</script>

<GGPlot
  {data}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
/>
<GGPlot
  {data}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
/>
<button onclick={() => interaction.setSelection(["gentoo-1"], { scope })}>
  Select Gentoo 1
</button>
\`\`\`

Use \`setSelection\`, \`toggleSelection\`, and \`clearSelection\` for durable
keys. \`setEmphasis\` is presentation-only: linked charts update their highlight
overlay without retraining scales or rerunning the render pipeline. Matching
\`x\` and \`y\` scope names share numeric zoom domains. When application data is
replaced, call \`reconcileKeys(validKeys, { scope })\` explicitly; a chart never
guesses whether a temporary subset should erase another view's selection.

Durable facet intervals use their own optional \`interactionScope.intervals\`
namespace (falling back to \`keys\`). Read them with \`intervals(scope)\`, write
one with \`setInterval\`, clear one panel with \`clearInterval\`, or clear the
scope with \`clearIntervals\`. Interval state is semantic data-space state, not
pixels or renderer indices.

## Legend focus

\`legendFocus={true}\` adds real HTML controls over discrete color and fill
legends. Hover and DOM focus preview one chart without mutating shared state.
Click, touch, Enter, or Space commits the matching stable row keys; the active
entry or Escape clears them. Arrow keys traverse entries in rendered legend
order, with Home and End moving to the boundaries.

\`legendFocus={{ preview: false }}\` keeps committed activation but disables
transient previews. Continuous ramps remain static. A stable \`key\` is required:
encoded legend values are reported as values, never used as controller keys.
Focused and muted marks share one semantic mask across SVG and canvas, and the
mask does not retrain scales, recompute statistics, change layout, or reassign
colors. See the [runnable three-view example](/examples/interaction/legend-focus).

## Legend filtering

\`legendFocus\` is presentation emphasis only — it does not change data.
\`legendFilter={true}\` adds Show-group checkboxes on discrete color/fill
legends and filters rows before facets, stats, scales, layout, and render.
Hidden groups stay in the legend catalog and keep the same categorical color
when shown again.

Use \`legendFilter={{ mode: "exclude", multiple: true }}\` for the default
independent checkboxes. \`mode: "include"\` stores the shown values instead;
\`multiple: false\` makes a toggle isolate one group. \`onlegendfilter\` reports
the raw typed values and field in a \`LegendFilterClause\`. Reset legend filters
restores the data pipeline; Clear legend focus only removes presentation
emphasis. See the [stable-color example](/examples/interaction/legend-filter).

## Brush zoom

\`zoom={true}\` enables two-dimensional brush zoom. Set \`zoom={{ mode: "x" }}\`
or \`zoom={{ mode: "y" }}\` for a single axis. The tool rail separates Zoom area
from Select area when both are enabled. A completed zoom emits explicit
domains; Reset zoom or double-click emits a clear event.
Faceted interval selection is supported, but faceted brush zoom remains
disabled with \`INTERACTION_INTERVAL_FACET_UNSUPPORTED\`; use a linked detail
view when each facet needs a zoomed inspection surface.

\`\`\`svelte fragment
<GGPlot
  zoom={{ mode: "xy" }}
  onzoom={(event) => console.log(event.domains)}
/>
\`\`\`

## Precise bounds without dragging

After an interval selection or zoom is committed, the tool rail exposes Edit x
or y bounds alongside its drag controls. The inline HTML form stages edits:
typing does not rerun the chart, Apply commits once, Cancel or Escape discards
the draft, and validation focuses the first invalid field. This provides a
keyboard and assistive-technology path to the same semantic result as brushing.

- Linear and reversed scales accept ascending data-space numbers. Reversal is
  presentation only, so do not enter screen order.
- Log scales accept positive ascending numbers.
- Time scales accept ISO 8601 dates or date-times with \`Z\` or an explicit
  offset; events store Unix milliseconds.
- Band scales use two native selects and include both endpoint categories.

Recovery actions are deliberately separate: Clear panel selection removes one
facet interval, Clear all selections removes interval state, Reset zoom restores
natural domains, and Reset legend filters restores excluded rows. None of these
controls silently performs another reset.

## Event reference

All events carry \`type\`, \`phase\`, and \`source\` (\`pointer\`, \`keyboard\`,
\`touch\`, or \`programmatic\`). Use the focused callback for one capability or
\`oninteraction\` for the discriminated union of every event.

### \`oninspect(event: PlotInspection)\`

- A change is \`{ type: "inspect", phase: "change", state, source, mode,
  panelId, focus, members }\`.
- \`state\` is \`transient\` or \`pinned\`; \`members\` is always non-empty and
  \`focus\` is the member under direct inspection.
- \`x\` and \`y\` changes also carry the original logical \`axisValue\` and its
  formatted \`axisLabel\`.
- Dismissal is the small event \`{ type: "inspect", phase: "clear", source }\`.

Each \`PlotDatum\` has \`key\`, source \`row\` when one exists, aggregate
\`sourceKeys\` and \`lineageCount\`, \`layerIndex\`, \`panelId\`, mapped \`fields\`,
and a plot-pixel \`anchor\`. Keyless or synthetic marks expose \`key: null\`;
internal renderer indices never leak into callbacks.

### \`onselect(event: PlotSelection)\`

- Point selection emits \`{ type: "select", phase: "end" | "clear",
  mode: "point", keys, source }\`.
- Interval selection emits \`start\`, \`change\`, \`end\`, and \`clear\` phases with
  \`mode\`, \`panelId\`, \`domain\`, \`pixels\`, \`keys\`, \`lineageCount\`, and
  \`source\`.

### \`onzoom(event: ZoomEvent)\`

- Zoom completion is \`{ type: "zoom", phase: "end", source, domains }\`.
- Reset is \`{ type: "zoom", phase: "clear", source, domains: null }\`.

### \`onlegendfocus(event: LegendFocusEvent)\`

- Preview and commit emit \`{ type: "legend-focus", phase: "change", state,
  source, scale, value, label, keys }\`.
- \`state\` is \`transient\` or \`committed\`. \`value\` is the raw encoded
  domain value while \`keys\` are distinct stable source-row identities.
- Dismissal emits \`{ type: "legend-focus", phase: "clear", source }\`.

### \`onlegendfilter(event: LegendFilterEvent)\`

- A change emits \`{ type: "legend-filter", phase: "change", source, clause }\`.
- \`clause\` names the color or fill scale, source field, typed values, and
  include or exclude mode. Reset emits \`phase: "clear"\` and \`clause: null\`.
- Filtering is data-changing and intentionally separate from the
  presentation-only \`onlegendfocus\` event.

\`oninteraction(event: PlotInteractionEvent)\` receives the same objects. It
does not wrap or duplicate them. A linked chart that consumes shared state
should not re-emit the origin chart's event.

## Keyboard and accessibility defaults

Focus the plot, then use arrow keys or brackets to traverse data. Enter or
Space pins inspection, activates point selection, or sets the two corners of
an area, depending on the active tool. Escape dismisses the current
interaction. Keyboard inspection updates a polite live region with a concise
axis, count, and pin summary; complete pinned content remains ordinary labelled
and navigable DOM.

## Identity and diagnostics

Use \`key="id"\` when the row has a field, or \`key={(row) => row.id}\` for an
accessor. Keys must be non-null unique \`PropertyKey\` values and stable across
updates. Invalid or duplicate keys emit structured diagnostics through
\`ondiagnostic\`; they never silently fall back to array positions. Stable keys
let pinned inspection and point selection follow a datum when data is updated.
`;

const interactionDiagnostics = Object.values(INTERACTION_DIAGNOSTIC_CATALOG)
  .map(
    (entry) => `### \`${entry.code}\`

${entry.message}

- Prop: \`${entry.prop}\`
- Severity: \`${entry.severity}\`
- Try: ${entry.suggestions.join("; ")}
- More: [${entry.docUrl}](${entry.docUrl})`,
  )
  .join("\n\n");

export const INTERACTION_REFERENCE_MD = `# Interaction reference

Searchable interaction contract. Chart-local state and callbacks by default.
\`createPlotInteraction()\` for shared semantic state across plots and UI.

## Static default

No capture layer, tooltip, selection, or zoom until a capability is enabled.
Page scroll is not hijacked by unused tools.

## Capability props

### \`inspect\`

Enables inspection, the default HTML tooltip, semantic crosshair, keyboard
traversal, and optional pinning. Inputs are \`true\` or options with \`mode\`,
\`pin\`, \`maxDistance\`, \`content\`, and \`contentMode\`.

### Point selection

\`select={{ type: "point", multiple: true }}\` stores stable semantic keys.
Supply \`key\` for every row.

### Interval selection

\`select={{ type: "interval", mode: "x" | "y" | "xy", persistent: true }}\`
enables an explicit Select area tool and emits domain and pixel bounds. In
facets, add \`preset: "independent" | "union" | "cross-panel"\` to replace one
panel, combine panel selections, or project one domain through compatible
panels.

### \`zoom\`

\`zoom={{ mode: "x" | "y" | "xy" }}\` enables the explicit Zoom area tool.
Reset zoom and double-click return to the natural domains.

### \`legendFocus\`

\`legendFocus={true}\` enables discrete legend preview and committed focus.
Use \`legendFocus={{ preview: false }}\` to disable hover/focus preview while
retaining click, touch, Enter, Space, Escape, and arrow-key controls. It
requires stable row \`key\` values and does not make continuous ramps interactive.

### \`legendFilter\`

\`legendFilter={true}\` adds native Show-group checkboxes to discrete color and
fill legends. It changes the rows supplied to facets, statistics, scales, and
rendering while preserving the full legend catalog and categorical color
identity. Configure \`mode: "exclude" | "include"\` and \`multiple\`; receive
typed clauses through \`onlegendfilter\`. It is independent of
presentation-only \`legendFocus\`.

## Controlled tool

\`tool\` and \`ontoolchange\` control the active Inspect, Select area, or Zoom
area mode. Keep the value in Svelte state when application controls and the
plot tool rail must stay synchronized:

\`\`\`svelte fragment
<script lang="ts">
  import type { InteractionTool } from "@ggsvelte/svelte";

  let activeTool = $state<InteractionTool>("inspect");
</script>

<GGPlot
  inspect={true}
  select={{ type: "interval" }}
  tool={activeTool}
  ontoolchange={(next) => (activeTool = next)}
/>
\`\`\`

A controlled unavailable tool requests a change and emits a diagnostic; it
does not silently arm a different drag behavior. The active tool remains local
to one chart; shared controllers coordinate data semantics, not UI modes.

## Shared controller

\`createPlotInteraction<Key>({ onchange? })\` returns a reactive
\`PlotInteractionController<Key>\`. Pass it through the \`interaction\` prop and
name the semantic channels with the required
\`interactionScope={{ keys, x?, y? }}\`; controlled plots never fall back to a
generic scope or infer x/y channel names from encodings. Controlled zoom
requires an explicit scope for every active channel (x, y, or both).

- Reads: \`selected(scope)\`, \`emphasized(scope)\`, \`intervals(scope)\`,
  \`isSelected(key, scope)\`, \`zoom(scope)\`, \`snapshot\`, and \`revision\`.
- Selection: \`setSelection\`, \`toggleSelection\`, and \`clearSelection\`.
- Lightweight presentation: \`setEmphasis\` and \`clearEmphasis\`.
- Facet intervals: \`setInterval\`, \`clearInterval\`, and \`clearIntervals\`.
- Domains: \`setZoom\` and \`resetZoom\` for finite numeric x/y pairs.
- Data replacement: \`reconcileKeys(validKeys, { scope })\` explicitly removes
  selected or emphasized keys that no longer exist.

Scopes are application-level names. Reuse a key scope only where keys mean the
same thing, and reuse x/y scopes only where their data domains are compatible.
Every mutation returns one immutable transition or \`null\` for a no-op. Passive
consumers never republish controller state, preventing linked-view feedback
loops. Do not mutate the controller inside its synchronous \`onchange\`
callback; schedule a later Svelte application update instead. See the
[linked views example](/interactions/linked-views).

## Identity

\`key\` is a field name or accessor returning a unique stable \`PropertyKey\`. Public
events expose semantic keys, aggregate \`sourceKeys\`, and \`lineageCount\`,
never renderer indices.

## Events

### \`oninspect\`

Receives \`PlotInspection\`: \`change\` with transient or pinned focus and
members, or \`clear\`.

### \`onselect\`

Receives \`PlotSelection\`. Point selection emits \`end\` and \`clear\`.
Interval selection emits \`start\`, \`change\`, \`end\`, and \`clear\`.

### \`onzoom\`

Receives \`ZoomEvent\`: \`end\` with explicit domains or \`clear\` with null
domains.

### \`onlegendfocus\`

Receives \`LegendFocusEvent\`: a transient or committed \`change\` carrying the
raw encoded value, formatted label, scale channel, and stable row keys, or a
small \`clear\` event. The same object is included in \`oninteraction\`.

### \`onlegendfilter\`

Receives \`LegendFilterEvent\`: a \`change\` with one typed
\`LegendFilterClause\`, or \`clear\` with \`clause: null\`. Legend filtering
changes pipeline input and is not folded into the presentation interaction
union.

### \`oninteraction\`

Receives the same discriminated \`PlotInteractionEvent\` union emitted by the
focused callbacks. Narrow on \`type\` and \`phase\`.

### \`ondiagnostic\`

Receives structured \`PlotDiagnostic\` objects (\`InteractionDiagnostic\` or
\`DeprecationDiagnostic\`) with \`severity\`, \`code\`, \`message\`, \`prop\`,
\`suggestions\`, and \`docUrl\`. Deprecation advisories also carry \`since\`
and \`removeIn\`.

\`\`\`svelte fragment
<GGPlot
  ondiagnostic={(diagnostic) =>
    console.warn(diagnostic.code, diagnostic.message, diagnostic.suggestions)}
/>
\`\`\`

Every event has a \`source\`: \`pointer\`, \`keyboard\`, \`touch\`, or
\`programmatic\`.

## Diagnostics

${interactionDiagnostics}

## Accessibility

The plot surface is named and keyboard focusable when interaction is enabled.
Arrow keys or brackets traverse data; Enter or Space pins or commits the active
tool; Escape dismisses. A polite live region announces concise state while
pinned HTML remains labelled, navigable DOM. Area tools remain explicit so
ordinary page scrolling is available until a user chooses a drag mode.

Committed interval and zoom state exposes precise Edit-bounds buttons in the
tool rail. Their inline form uses labelled native inputs, stages drafts until
Apply, validates log/time/category constraints, restores trigger focus after
Apply or Cancel, and supports Escape. Linear and reversed domains use ascending
data values; time uses ISO 8601 text; band intervals use inclusive native
selects. Clear panel selection, Clear all selections, Reset zoom, and Reset
legend filters remain separate operations.
`;

export interface InteractionReferenceEntry {
  id: string;
  name: string;
  summary: string;
  href: string;
  keywords: readonly string[];
}

/** Search data for the human-facing reference page, kept beside its prose. */
export const INTERACTION_REFERENCE_INDEX: readonly InteractionReferenceEntry[] = [
  {
    id: "static-default",
    name: "Static by default",
    summary: "No capture layer or gesture until a capability is enabled.",
    href: "/guide/interaction-reference#static-default",
    keywords: ["opt in", "capture", "scroll"],
  },
  {
    id: "inspect",
    name: "Inspect and pin",
    summary: "HTML tooltip, semantic crosshair, pointer and keyboard traversal.",
    href: "/guide/interaction-reference#inspect",
    keywords: ["tooltip", "crosshair", "pin", "keyboard"],
  },
  {
    id: "point-selection",
    name: "Point selection",
    summary: "Select records by stable semantic keys, not renderer indices.",
    href: "/guide/interaction-reference#point-selection",
    keywords: ["select", "multiple", "keys"],
  },
  {
    id: "interval-selection",
    name: "Interval selection",
    summary: "Brush a rectangle; receive domain, pixels, and semantic keys.",
    href: "/guide/interaction-reference#interval-selection",
    keywords: ["brush", "rectangle", "domain", "facet", "union", "cross-panel"],
  },
  {
    id: "zoom",
    name: "Brush zoom",
    summary: "Zoom x, y, or both with an explicit area tool and reset path.",
    href: "/guide/interaction-reference#zoom",
    keywords: ["domain", "reset", "double click"],
  },
  {
    id: "legend-focus",
    name: "Legend focus",
    summary: "Preview or commit discrete legend groups across SVG and canvas.",
    href: "/guide/interaction-reference#legendfocus",
    keywords: ["legendFocus", "onlegendfocus", "emphasis", "keyboard", "touch"],
  },
  {
    id: "legend-filter",
    name: "Legend filtering",
    summary: "Include or exclude groups before stats/scales; color identity stable.",
    href: "/guide/interaction-reference#legendfilter",
    keywords: ["legendFilter", "onlegendfilter", "filter", "checkbox", "stable color"],
  },
  {
    id: "controlled-tool",
    name: "Controlled tool",
    summary: "Bind active Inspect / Select area / Zoom area to Svelte state.",
    href: "/guide/interaction-reference#controlled-tool",
    keywords: ["tool", "ontoolchange", "state"],
  },
  {
    id: "shared-controller",
    name: "Shared controller",
    summary: "Scoped selection, emphasis, and domains across plots and UI.",
    href: "/guide/interaction-reference#shared-controller",
    keywords: ["createPlotInteraction", "linked views", "scope", "reconcileKeys"],
  },
  {
    id: "identity",
    name: "Stable identity",
    summary: "Unique application keys for inspection and selection across updates.",
    href: "/guide/interaction-reference#identity",
    keywords: ["key", "lineage", "sourceKeys"],
  },
  {
    id: "events",
    name: "Typed events",
    summary: "Focused callbacks or PlotInteractionEvent with explicit phases.",
    href: "/guide/interaction-reference#events",
    keywords: ["oninspect", "onselect", "onzoom", "oninteraction", "phase"],
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    summary: "Structured codes, props, suggestions, and doc URLs.",
    href: "/guide/interaction-reference#diagnostics",
    keywords: ["ondiagnostic", "warning", "error", "suggestions"],
  },
  {
    id: "accessibility",
    name: "Accessibility",
    summary: "Keyboard traversal, bounds form, live region, labelled DOM, explicit tools.",
    href: "/guide/interaction-reference#accessibility",
    keywords: ["screen reader", "keyboard", "live region", "focus", "bounds", "ISO 8601"],
  },
];

export const MIGRATING_PRE_0_1_MD = `# Migrating pre-0.1 interactions

Pre-0.1 props named presentation; current props name intent. Update props,
callback payloads, and custom tooltip snippets together — no runtime shim.

## Rename the props and callbacks

- \`tooltip\` → \`inspect\`
- \`brush\` → \`select={{ type: "interval" }}\`
- \`onhover\` → \`oninspect\`
- \`onbrush\` → \`onselect\`
- \`onzoom={(domains) => ...}\` → \`onzoom={(event) => ...}\`

Before:

\`\`\`svelte fragment
<GGPlot
  tooltip={true}
  brush={true}
  zoom={true}
  onhover={(hit) => (hovered = hit)}
  onbrush={(selection) => (brushed = selection)}
  onzoom={(domains) => (zoomed = domains)}
/>
\`\`\`

After:

\`\`\`svelte fragment
<GGPlot
  key="id"
  inspect={true}
  select={{ type: "interval" }}
  zoom={true}
  oninspect={(event) => (inspection = event)}
  onselect={(event) => (selection = event)}
  onzoom={(event) => (zoomed = event.domains)}
/>
\`\`\`

## Migrate payload handling

\`oninspect\` is a lifecycle. Narrow on \`event.phase === "change"\` before
reading \`focus\`, \`members\`, or \`mode\`; a clear event deliberately carries
only its type, phase, and source. Use \`event.focus.row\` instead of resolving a
renderer hit index yourself.

\`onselect\` also has phases. Interval callbacks receive domain and pixel
bounds on \`event.domain\` and \`event.pixels\`, and return stable semantic
\`event.keys\` instead of source-row indices and renderer hits. Point selection
uses the same callback with \`event.mode === "point"\`.

\`onzoom\` now reports an event. Read \`event.domains\` after an \`end\` phase;
the \`clear\` phase carries \`domains: null\`.

## Migrate custom tooltip snippets

The snippet argument changed from one renderer hit to a semantic inspection:

- \`TooltipContext\` → \`PlotInspectionChange\`
- \`context.row\` → \`inspection.focus.row\`
- \`context.fields\` → \`inspection.focus.fields\`
- \`BrushSelection\` → \`IntervalSelection\`
- \`ZoomDomains\` → \`ReadonlyZoomDomains\`

The old type names remain deprecated aliases where a safe alias is possible,
but the old component props and old callback shapes are removed. Pre-0.1 means
there is no runtime compatibility shim: TypeScript errors should point directly
at every source change you need to make.

See [Interactions](/guide/interactions) for current options, event shapes,
keyboard behavior, and identity requirements.
`;

export const UPGRADING_MD = `# Upgrade in five minutes

One section per released 0.x transition, newest first. Each heading is a
stable anchor that changesets and release notes link to. Pre-1.0, breaking
changes ride minor releases; every deprecation or removal ships with a
migration note here. The pre-release API has its own page:
[Migrating pre-0.1 interactions](/guide/migrating-pre-0-1).

## Five-minute path

- Check that linked \`@ggsvelte/svelte\`, core, and spec packages resolve to one compatible release.
- Read only the adjacent transition sections needed for the installed version.
- Apply the before/after source change backed by the migration fixtures.
- Run strict type, build, render, and visual checks before deploying.
- Follow a stable diagnostic anchor if blocked; roll package versions back together if needed.

The accepted lifecycle and deprecation policy remains in
[Lifecycle and editions](/guide/lifecycle#lifecycle-tags); this page applies it
rather than creating a second policy.

## 0.10 to 0.11

### Compose the theme as a child layer

The \`theme\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose the theme as a declaration-only child instead — named shells
for every built-in theme, or the generic \`<Theme>\` escape hatch for dynamic
names and role overrides. When both a prop and a child are present, the child
wins.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- Before 0.11: theme was a top-level GGPlot prop. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} theme="dark">
  <GeomPoint />
</GGPlot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, ThemeDark } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- After 0.11: compose the theme as a declaration-only child layer. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }}>
  <ThemeDark />
  <GeomPoint />
</GGPlot>
\`\`\`

\`LayerDescriptor\` is also renamed to \`MarkLayerDescriptor\` (the old name
remains a type-only alias until 0.13.0).

### Compose scales as child layers

The \`scales\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose scales as declaration-only children instead — named shells
for every color/fill helper (\`<ScaleColorDiscrete/>\`, \`<ScaleFillManual/>\`,
British \`Colour\` aliases, …), or the generic \`<Scale value={…}>\` escape hatch
for raw fragments, computed scales, and families without shells yet
(position/style ship in a later slice). When both a prop and a child configure
the same channel, the child wins. Two children on one channel emit a
\`DUPLICATE_SCALE_CHANNEL\` advisory (last child still wins).

Named shells route through the matching helpers, so migrating a raw fragment
like \`scales={{color:{scheme:"colorblind"}}}\` to
\`<ScaleColorDiscrete scheme="colorblind"/>\` adds \`type:"ordinal"\` to the
PortableSpec (rendering is unchanged). Use \`<Scale value={…}>\` when you need
byte-identical PortableSpec.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleColorDiscrete,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- Before 0.11: scales was a top-level GGPlot prop. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "c" }}
  scales={scaleColorDiscrete({ scheme: "colorblind" })}
>
  <GeomPoint />
</GGPlot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    ScaleColorDiscrete,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- After 0.11: compose scales as declaration-only child layers. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "c" }}>
  <ScaleColorDiscrete scheme="colorblind" />
  <GeomPoint />
</GGPlot>
\`\`\`

\`PlotDiagnostic\` also widens to include \`CompositionDiagnostic\`
(\`DUPLICATE_SCALE_CHANNEL\`, \`DUPLICATE_PLOT_LAYER\`). Exhaustive \`switch\` on
\`.code\` needs new arms; handlers annotated \`PlotDiagnostic\` keep compiling.

### Compose coord as a child layer

The \`coord\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose the coordinate system as a declaration-only child instead —
\`<CoordFlip/>\`, \`<CoordFixed/>\` / \`<CoordEqual/>\`, \`<CoordTransform/>\`,
\`<CoordCartesian/>\`, or the generic \`<Coord value={…}>\` escape hatch. When
both a prop and a child are present, the child fully replaces the prop
(REPLACE family). Two coord children emit a \`DUPLICATE_PLOT_LAYER\` advisory
(last child still wins).

### Compose facet as a child layer

The \`facet\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose facets as declaration-only children instead — \`<FacetWrap
field="g"/>\`, \`<FacetGrid rows="a" cols="b"/>\`, or the complete
\`<Facet wrap={…} />\` surface. Keep \`strip\` nested
(\`strip={{position,show}}\`). When both a prop and a child are present, the
child fully replaces the prop (REPLACE family). Two facet children emit a
\`DUPLICATE_PLOT_LAYER\` advisory (last child still wins). Bare \`<Facet/>\`
with no wrap/rows/cols fails validation (\`facet-form-missing\`).

### Compose labs as a child layer

The \`labs\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose labels as a declaration-only child instead —
\`<Labs title="Sales" subtitle="FY25" x="Quarter" color="Region"/>\`. There is
no \`<Labs value={…}>\` escape hatch because Labs is a flat bag of strings:
\`<Labs {...computed} />\` already covers the computed case.

labs is a MERGE family, so a child adds to (rather than replaces) the prop and
its siblings: two \`<Labs/>\` children setting different keys both survive. Two
children setting the SAME key emit a \`DUPLICATE_MERGE_KEY\` advisory and the
later one wins.

### Compose guides as child layers

The \`guides\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Guides are keyed by aesthetic, so the child form is one shell per
guide TYPE taking a \`channel\` prop — the aesthetic is a key, never part of the
component name: \`<GuideAxis channel="x" showTicks={false}/>\`,
\`<GuideLegend channel="color" position="bottom"/>\`,
\`<GuideColorbar channel="fill"/>\`, \`<GuideColorsteps channel="color"/>\`,
\`<GuideNone channel="size"/>\`, plus \`<Guides value={…}>\` for raw or computed
guide bags.

guides is a MERGE family keyed by channel, but the value AT a channel is
replaced whole — a child never field-merges into a prop's guide object. Two
guide children on one channel emit a \`DUPLICATE_MERGE_KEY\` advisory (last
child still wins). A top-level guide child still wins over a scale-local
\`guide\` on the same channel, exactly as the \`guides\` prop did.

The shells carry no scale knowledge and do not guess: \`<GuideColorbar/>\` over
a discrete color scale fails loudly rather than silently degrading to a legend.

### Compose legend as a child layer

The \`legend\` prop on \`<GGPlot>\` is deprecated since 0.11.0 (removable in
0.13.0). Compose it as \`<Legend order="sorted"/>\`.

\`<Legend order>\` is the plot-wide entry-SORT enum
(\`"stable-domain"\` | \`"present-first-seen"\` | \`"sorted"\`); ordering never
changes color assignments. It is NOT \`<GuideLegend order={2}/>\`, which is a
per-aesthetic INTEGER placement rank. Same word, unrelated concepts — the two
compose independently on one plot.

### Migrate the grammar props with the codemod

All seven grammar props above move mechanically, so \`@ggsvelte/svelte\` ships a
codemod. It is opt-in and prints a diff by default — it writes nothing until
you pass \`--write\`:

\`\`\`bash complete
# see what would change
npx ggsvelte-codemod src

# apply it
npx ggsvelte-codemod --write src
\`\`\`

It rewrites \`facet\`, \`coord\`, \`scales\`, \`guides\`, \`legend\`, \`theme\` and
\`labs\` into their child layers and adds the components to the
\`@ggsvelte/svelte\` import that already provided \`GGPlot\`. Migrated children are
inserted BEFORE any child the file already had, because props apply before
children — so a hand-written \`<ScaleColorDiscrete/>\` keeps winning over a
migrated \`scales\` prop exactly as it did before.

The rewrite is meaning-preserving, never a style rewrite. It targets the
generic escape hatches (\`<Coord value={…}/>\`, \`<Scale value={…}/>\`,
\`<Guides value={…}/>\`) rather than the named shells this guide recommends by
hand: for scales the named form is not byte-identical (\`normalize()\` does not
infer a scale \`type\`), so choosing it is a judgment call the tool does not
make for you. Flat prop bags become named props —
\`labs={{ title: "Sales" }}\` → \`<Labs title="Sales"/>\` — falling back to
\`<Labs {...expr}/>\` for anything it cannot expand losslessly.

One shape is deliberately left alone: \`theme={expr}\` where \`expr\` is not a
string literal. \`theme\` accepts \`ThemeName | ThemeSpec\` and \`<Theme>\` has no
\`value\` hatch, so routing a dynamic value needs a human. Those sites are
printed as \`manual change required\` with a link back to this guide — the tool
reports them rather than half-migrating them.

Two more things worth knowing: the codemod only touches files that import
\`GGPlot\` from \`@ggsvelte/svelte\` (a \`GGPlot\` of your own is never rewritten),
and it edits only the ranges it changes, so run your formatter afterwards if
you keep multi-line open tags.

### Diagnostic handlers receive \`PlotDiagnostic\`

\`ondiagnostic\` now receives the \`PlotDiagnostic\` union
(\`InteractionDiagnostic | DeprecationDiagnostic\`). Explicitly annotated
handlers that named \`InteractionDiagnostic\` alone need a one-line type
widening; inline arrow props continue to infer.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type {
    InteractionDiagnostic,
    PlotDiagnostic,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function legacy(diagnostic: InteractionDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }

  // @ts-expect-error Pre-0.11 InteractionDiagnostic-only handlers are not assignable to PlotDiagnostic.
  const ondiagnostic: (diagnostic: PlotDiagnostic) => void = legacy;
</script>

<!-- Before 0.11: ondiagnostic was typed as InteractionDiagnostic only. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { PlotDiagnostic } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function ondiagnostic(diagnostic: PlotDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }
</script>

<!-- After 0.11: ondiagnostic receives PlotDiagnostic (interaction ∪ deprecation). -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
\`\`\`

## 0.7 to 0.8

### Map style semantics instead of precomputing outputs

Mapped \`size\`, \`linewidth\`, and \`alpha\` now train and render complete
scales. \`shape\` and \`linetype\` now use closed finite symbol sets. Remove
application-side radius, opacity, stroke-width, and dash lookup columns when
they only existed to compensate for ignored style mappings. Map the semantic
source field and select a scale family instead.

Before 0.8, applications commonly precomputed a point radius and passed it
through identity:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  // Before 0.8, applications precomputed symbol radii.
  const rows = [
    { x: 1, y: 2, radius: 2 },
    { x: 2, y: 3, radius: 5 },
    { x: 3, y: 4, radius: 9 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", size: "radius" }}
  scales={{ size: { type: "identity" } }}
>
  <GeomPoint />
</GGPlot>
\`\`\`

In 0.8, keep the source measure and let the scale interpolate in symbol area:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleSizeContinuous,
  } from "@ggsvelte/svelte";

  // In 0.8, map the semantic measure and let size interpolate in symbol area.
  const rows = [
    { x: 1, y: 2, magnitude: 4 },
    { x: 2, y: 3, magnitude: 25 },
    { x: 3, y: 4, magnitude: 81 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", size: "magnitude" }}
  scales={scaleSizeContinuous({ range: [2, 9] })}
>
  <GeomPoint />
</GGPlot>
\`\`\`

Review implicit grouping on line, area, smooth, errorbar, and boxplot layers.
Discrete and binned style mappings now split groups, as color/fill mappings do;
continuous numeric styles do not. If a discrete style is descriptive rather
than structural, author an explicit \`group\` mapping. Shape/linetype do not
silently interpolate quantitative values: use \`type: "binned"\` or move the
measure to a numeric style channel.

A mapped \`alpha\` is now the complete authored opacity aesthetic; it is not
multiplied by a competing scalar geom \`alpha\` parameter. Remove that scalar
parameter and set the mapped scale's \`range\` when you need a lower opacity
ceiling.

### Move guide layout into the guide API

Automatic non-position guides now move below the chart when the viewport is at
most 480px or a right guide would leave less than 320px of readable panel.
Bottom colorbars/colorsteps are horizontal and discrete keys wrap without
shrinking text. If an application positioned or hid the old fixed right legend
with surrounding CSS, remove that workaround and author portable guide intent:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomPoint } from "@ggsvelte/svelte";

  // Before 0.8, automatic legends always occupied the fixed right column.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", color: "region" }}>
  <GeomPoint />
</GGPlot>
\`\`\`

In 0.8, declare the alternate presentation directly:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomPoint, guideLegend } from "@ggsvelte/svelte";

  // Since 0.8, guide presentation is portable and responsive without changing scale math.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "region" }}
  guides={{
    color: guideLegend({ position: "bottom", direction: "horizontal" }),
  }}
>
  <GeomPoint />
</GGPlot>
\`\`\`

Top-level \`guides\` override scale-local \`guide\` settings. Use
\`guideNone()\` for suppression and \`force: true\` only when an identity or
single-value manual guide is intentional. Guide appearance does not alter scale
domains or assignments. Exact discrete entries remain focus/filter targets;
numeric guide ticks and bins remain representative and non-interactive.

## 0.8 to 0.9

### Constrain the data rectangle instead of the outer box

Before 0.9, CSS \`aspect-ratio\` on a chart wrapper constrained the complete SVG.
Axes, titles, and guides still changed the inner panel ratio, so equal data
units could render at unequal physical lengths:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomLine } from "@ggsvelte/svelte";

  // Before 0.9, an outer CSS aspect ratio could not preserve data-unit lengths
  // after axes, titles, and guides consumed chart space.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<div style="aspect-ratio: 1">
  <GGPlot data={circle} aes={{ x: "x", y: "y" }}>
    <GeomLine />
  </GGPlot>
</div>
\`\`\`

Since 0.9, remove that wrapper workaround and author the coordinate directly:

\`\`\`svelte fragment
<script lang="ts">
  import { coordFixed, GGPlot, GeomLine } from "@ggsvelte/svelte";

  // Since 0.9, constrain the measured data rectangle instead of the outer box.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<GGPlot data={circle} aes={{ x: "x", y: "y" }} coord={coordFixed()}>
  <GeomLine />
</GGPlot>
\`\`\`

\`coordFixed({ ratio: 1 })\` measures the trained data rectangle after chart
chrome is allocated and letterboxes it without distortion. Fixed aspect now
rejects \`facet.scales\` values \`"free"\`, \`"free_x"\`, and \`"free_y"\`; switch those
facets to \`"fixed"\` or remove the fixed coordinate rather than presenting a
false shared physical scale.

## 0.6 to 0.7

### Choose explicit color/fill families

Color/fill now exposes complete continuous, discrete, binned, transformed,
temporal, manual, and identity helpers. Existing \`ordinal\` and \`sequential\`
JSON remains canonical. Review charts that relied on implicit continuous
clamping: with an explicit domain, the default \`oob: "censor"\` now uses
\`unknownValue\`; opt into \`oob: "squish"\` to clamp deliberately.

Use \`type: "binned"\` plus semantic \`breaks\` for colorsteps. Manual scales
require one range color per explicit domain value and never recycle extras.
Identity scales accept validated hex source values and suppress their guide by
default. Replace ad-hoc preprocessing with \`scaleColorDate\`/
\`scaleColorDatetime\` and an explicit parser when date order is ambiguous.

Before 0.7, an explicit continuous color domain clamped implicitly:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, score: -10 },
    { x: 2, y: 3, score: 50 },
    { x: 3, y: 4, score: 110 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "score" }}
  scales={{ color: { type: "sequential", domain: [0, 100] } }}
>
  <GeomPoint />
</GGPlot>
\`\`\`

In 0.7, opt into clamping when it is the intended encoding:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleColorContinuous,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, score: -10 },
    { x: 2, y: 3, score: 50 },
    { x: 3, y: 4, score: 110 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "score" }}
  scales={scaleColorContinuous({
    domain: [0, 100],
    oob: "squish",
  })}
>
  <GeomPoint />
</GGPlot>
\`\`\`

\`RenderModel.guidePlans\` now includes serializable \`discrete\`, \`colorbar\`,
and \`colorsteps\` plans beside axes. Code that assumed every plan was an axis
must narrow on \`plan.type === "axis"\` before reading axis-only fields.

## 0.5 to 0.6

### Move position transforms before statistics

Position transforms now follow ggplot2 staging: parsing, source-limit OOB, and
the scale transform happen before statistics and positions. The old late
projection produced incorrect smooths, bins, densities, summaries, and
boxplots. This is the pre-1.0 semantic-correctness exception in decision 0015;
there is no legacy staging switch.

Authored \`type: "log"\` still validates, but canonical specs now store
\`type: "linear", transform: "log10"\`. Prefer the explicit transform or
\`scaleXLog10\`/\`scaleYLog10\` helpers. A codemod would only rewrite spelling
and cannot decide whether changed statistics are intended, so migration remains
a manual chart review.

Before 0.6, this fit used the old late log projection:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={{ x: { type: "log", domain: [1, 1000] } }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

In 0.6, make the pre-stat transform and limit policy explicit, then compare the
fit with the intended analysis. The zero expansion below restores flush bounds;
the new default for non-temporal continuous and binned scales is 5%
multiplicative display expansion, including pinned domains.

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    scaleXLog10,
  } from "@ggsvelte/svelte";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={scaleXLog10({
    domain: [1, 1000],
    oob: "censor",
    expand: { mult: 0, add: 0 },
    nice: false,
  })}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

### Review limits, zoom, and transformed units

A pinned \`domain\` is now an unexpanded source limit. The default
\`oob: "censor"\` removes out-of-limit values before stats;
\`oob: "squish"\` clamps them before transform/stats. Brush zoom writes a
semantic domain with \`nice: false\` and zero expansion, so it intentionally
re-runs stats on the zoomed subset rather than acting like a post-stat
coordinate crop. Use a wider scale domain or squish only when that is the
intended analysis; a future coordinate-transform API owns visual-only zoom.

Position offsets and stack totals are transformed-space units. Under log10 or
sqrt, numeric \`stat_bin\` \`binwidth\`, \`boundary\`, and \`center\` are also
transformed-space units: for example log10 \`boundary: 0\` means semantic 1,
not \`log10(0)\`.

### Update scale and interaction inspection

Continuous log10/sqrt scales no longer report trained \`type: "log"\`.
\`RenderModel.scales\`, \`AxisGuidePlan\`, interval selections, and precise
bounds use family-plus-transform contracts:

\`\`\`text fragment
scale type / guide scaleType / interval kind: "linear"
transform: "identity" | "log10" | "sqrt"
\`\`\`

Reject or migrate transient snapshots containing \`kind: "log"\`; pre-1.0
interaction snapshots do not have a compatibility branch. Keep semantic
source-space domains and apply the named transform exactly once.

## 0.2 to 0.3

### Replace custom hit indexes with CandidateStore

The experimental \`buildHitIndex\` export and its \`SceneHitIndex\` types have been
removed. Every render model already owns a lazy \`CandidateStore\` with the same exact
geometry hit behavior, so custom browser hosts no longer build and retain a second
spatial index.

Before 0.3:

\`\`\`ts fragment
import { buildHitIndex } from "@ggsvelte/core/dom";

const hitIndex = buildHitIndex(model.scene);
const hit = hitIndex.hitTest(plotX, plotY);
\`\`\`

In 0.3, use the model-owned candidate identity directly. \`hitTest()\` follows
paint order, honors panel clipping, and returns \`CandidateFacts\`. Rectangle
queries remain available as \`model.candidates.queryRect(...)\` candidate ids.

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, type RenderModel } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 3 },
    { id: "b", x: 2, y: 4 },
  ];
  let model = $state<RenderModel | null>(null);
  let hitRow = $state<number | null>(null);

  function inspectPlotPixel(x: number, y: number): void {
    hitRow = model?.candidates.hitTest(x, y)?.rowIndex ?? null;
  }
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  key="id"
  inspect
  onrender={(next) => (model = next)}
>
  <GeomPoint />
</GGPlot>

<button type="button" onclick={() => inspectPlotPixel(100, 100)}>
  Resolve plot pixel
</button>
<p>{hitRow === null ? "No hit" : \`Row \${hitRow}\`}</p>
\`\`\`

For a separately constructed scene, call \`buildCandidateStore(scene, {
hitTolerance })\` from \`@ggsvelte/core\`. The old tolerance default remains 3
plot pixels.

## 0.1 to 0.2

No source changes are required: every 0.1 prop, callback, and export keeps
working in 0.2. One environment requirement changed: the \`svelte\` peer
dependency floor rose from \`^5.29.0\` to \`^5.33.1\`, so upgrade Svelte first.
The additions below are optional to adopt.

### Optional: shared interaction state with a controller

0.2 adds \`createPlotInteraction\` for linked views: selection, emphasis, and
zoom state shared across plots, controls, and tables. Chart-local props and
callbacks remain fully supported — reach for a controller only when more than
one surface consumes the same interaction state.

Chart-local (unchanged from 0.1):

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    type PlotSelection,
  } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  let selection = $state<PlotSelection<string> | null>(null);
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  onselect={(event) => (selection = event)}
>
  <GeomPoint />
</GGPlot>

<p>{selection === null ? 0 : selection.keys.length} selected</p>
\`\`\`

Shared controller (new in 0.2, optional):

\`\`\`svelte fragment
<script lang="ts">
  import {
    createPlotInteraction,
    GeomPoint,
    GGPlot,
  } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  const scope = { keys: "row-id", x: "flipper-mm", y: "mass-g" } as const;
  const interaction = createPlotInteraction<string>();
  const selected = $derived(interaction.selected(scope));
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
>
  <GeomPoint />
</GGPlot>

<p>{selected.length} selected</p>
\`\`\`

See the [linked views example](/interactions/linked-views) and
[Interactions](/guide/interactions) for the full controller contract.

### Deprecated type aliases

Unchanged in 0.2: these pre-0.1 names have been deprecated since 0.1.0 and
still compile. Replace them when convenient:

- \`BrushSelection\` → \`IntervalSelection\`
- \`TooltipContext\` → \`PlotInspectionChange\`
- \`ZoomDomains\` → \`ReadonlyZoomDomains\`

The payload changes behind these renames are documented in
[Migrating pre-0.1 interactions](/guide/migrating-pre-0-1#migrate-custom-tooltip-snippets).
`;
