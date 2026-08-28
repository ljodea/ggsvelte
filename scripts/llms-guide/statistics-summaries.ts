/**
 * Statistical summaries: the first half of the statistics-and-positions guide.
 */

export const STATISTICS_SUMMARIES_MD = `# Statistics and positions

Stats derive marks from mapped rows. Positions control how derived marks share
coordinate space.

The full list of statistical transforms lives in the
[stat reference](/reference/stats): after_stat columns and which geoms accept
each value. Open a specific stat, for example [count](/reference/stats/count)
or [smooth](/reference/stats/smooth).

Position adjustments are listed in the
[position reference](/reference/positions): stack, fill, dodge, jitter, nudge,
and identity, with \`positionParams\` for jitter and nudge.

## Statistical summaries

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
to multiple marks. **Interior rings** are even-odd **holes** (SVG
\`fill-rule="evenodd"\`, canvas, and hit-testing). \`GeometryCollection\` is
flattened to leaf Point/Line/Polygon families (recursive, nesting depth
capped). Mixed families in one layer still error (split layers).

Default stat is public **\`stat_sf\`** (ggplot2 \`stat_sf\`): geometry expand
runs on the normal non-identity frame path. Layer JSON stamps
\`stat: "sf"\` (not \`identity\`). No CRS / \`coord_sf\` yet — coordinates are
treated as already projected.

\`\`\`svelte fragment
<GeomSf alpha={0.9} />
\`\`\`

\`\`\`ts fragment
gg(regions, aes({ fill: "rate" })).geomSf().spec();
// layer.stat === "sf"; geometry column holds JSON.stringify({ type: "Polygon", ... })
\`\`\`

[SF polygons](/examples/sf/basic): three triangles filled by a rate field.
[GeometryCollection expand](/examples/sf/geometry-collection): one GC cell
renders as two polygon parts.

### SF text labels (\`geom_sf_text\`)

\`geom_sf_text\` (ggplot2 \`geom_sf_text\`) defaults to \`stat_sf_coordinates\`:
one representative point per geometry part, then draws \`aes.label\` there.
Point coordinates pass through; LineString uses the vertex mean;
Polygon uses the exterior-ring shoelace centroid. **MultiPoint /
MultiLineString / MultiPolygon emit one label per part** (feature aesthetics
duplicated onto each part). **GeometryCollection** expands to leaves first,
then the same per-part rule applies (one label per leaf part). Requires
\`aes.label\` (no \`aes.x\`/\`aes.y\`).

**Migration (multi-part labels):** earlier releases labeled only the first
Multi* component. Callers that relied on a single first-component label will
now see one label per part — filter geometries or aggregate labels if you need
the old single-label behavior.

\`\`\`svelte fragment
<GeomSf alpha={0.55} />
<GeomSfText size={14} />
\`\`\`

\`\`\`ts fragment
gg(regions, aes({ fill: "rate", label: "region" }))
  .geomSf({ alpha: 0.55 })
  .geomSfText({ size: 14 })
  .spec();
\`\`\`

[SF region labels](/examples/sf/labels): filled polygons with names at centroids.

### SF boxed labels (\`geom_sf_label\`)

\`geom_sf_label\` is the boxed sibling of \`geom_sf_text\`: same
\`stat_sf_coordinates\` placement, plus a measured rounded rect behind the text.
\`color\` is ink + box stroke; \`fill\` is the box background (theme paper by
default). Params include \`padding\`, \`radius\`, \`linewidth\`, and text
\`size\`/\`anchor\`/\`dx\`/\`dy\`.

\`\`\`svelte fragment
<GeomSf alpha={0.45} />
<GeomSfLabel padding={3} radius={2} size={13} />
\`\`\`

\`\`\`ts fragment
gg(regions, aes({ fill: "rate", label: "region" }))
  .geomSf({ alpha: 0.45 })
  .geomSfLabel({ padding: 3, radius: 2, size: 13 })
  .spec();
\`\`\`

[SF boxed labels](/examples/sf/boxed-labels): names on paper-backed label boxes.

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

## Blank (scale training without marks)

\`geom: "blank"\` (ggplot2 \`geom_blank\`) contributes mapped aesthetics to
**scale training and layout only** — no paint, no hit targets. Use it to expand
domains, force axes open for sparse marks, or reserve layout without drawing.

\`\`\`svelte fragment
<GeomBlank />
\`\`\`

\`\`\`ts fragment
gg(data, aes({ x: "x", y: "y" }))
  .geomPoint()
  .geomBlank({ aes: aes({ x: "x2", y: "y2" }) }) // expands domains only
  .spec();
\`\`\`

No channels are required. Mapped style channels (color, size, …) train their
scales without drawing marks. Surfaces: \`.geomBlank()\`, \`<GeomBlank />\`.

[Blank domain expand](/examples/blank/domain-expand): co-layer blank rows stretch
axes past the plotted points. [Blank axes only](/examples/blank/axes-only): axes
and scales with no marks.

`;
