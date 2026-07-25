# Example page audit inventory

Tracking list for follow-up PRs. **Do not** treat this as shipped product copy.

Generated for the gallery/interaction structural PR that:

- Moves interaction expositions off the gallery onto `/interactions/*`
- Removes example-page playground handoff + "Local PortableSpec only…"
- Leaves per-example Svelte API + description cleanup for later PRs

## Scope rules (every example page)

1. **AI-slot litmus** — delete Barnum/slop description text (delete, do not rewrite)
2. **Svelte API** — props that have child-component replacements must become children (`<Labs>`, `<Theme*>`, `<Scale*>`, `<Facet*>`, `<Coord*>`, geoms; never `layers=`)
3. **No embedded playground** on example pages (done globally on the template)
4. **Delete** any remaining "Local PortableSpec only — no upload or remote execution." (done on template)

## Structural (this PR)

| id                            | action                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `interaction/brush-zoom`      | **Moved** to `/interactions/brush-zoom`; excluded from gallery + homepage featured      |
| `interaction/facet-intervals` | **Moved** to `/interactions/facet-intervals`; excluded from gallery + homepage featured |
| `interaction/linked-views`    | **Moved** to `/interactions/linked-views`; excluded from gallery + homepage featured    |
| `interaction/tooltip`         | Stays in gallery (chart-like inspect demo; no tool-rail tabs in preview)                |
| `interaction/legend-filter`   | Stays in gallery for now                                                                |
| `interaction/legend-focus`    | Stays in gallery for now (uses `layers=` — high priority API fix)                       |
| Homepage featured             | Replaced `interaction/linked-views` with `point/scatter-color`                          |

## Summary counts

- Total example corpus entries: **44**
- Gallery after exclusion: **41**
- Still using deprecated GGPlot props: **43**
- - `layers=`: **1**
- - `labs=`: **43**
- - `theme=`: **38**
- - `scales=`: **28**
- - `facet=`: **4**
- - `coord=`: **3**
- Already using Geom children: **42**
- Description likely needs deletion (long / em-dash essay): **42**
- Journey / demo-chrome pages: **6**

## Per-example checklist

| id                            | route                                 | delete description | API props → children            | notes                                                            |
| ----------------------------- | ------------------------------------- | ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| `area/basic`                  | `/examples/area/basic`                | YES                | labs=, theme=, scales=          | —                                                                |
| `area/stacked`                | `/examples/area/stacked`              | YES                | labs=, theme=, scales=          | —                                                                |
| `bar/dodged`                  | `/examples/bar/dodged`                | YES                | labs=, theme=, scales=          | —                                                                |
| `bar/horizontal`              | `/examples/bar/horizontal`            | YES                | labs=, theme=, coord=           | —                                                                |
| `bar/proportions`             | `/examples/bar/proportions`           | YES                | labs=, theme=, scales=          | —                                                                |
| `bar/stacked`                 | `/examples/bar/stacked`               | YES                | labs=, theme=, scales=          | —                                                                |
| `boxplot/by-category`         | `/examples/boxplot/by-category`       | YES                | labs=, theme=, scales=          | —                                                                |
| `col/basic`                   | `/examples/col/basic`                 | YES                | labs=, theme=, scales=          | —                                                                |
| `col/long-labels`             | `/examples/col/long-labels`           | YES                | labs=                           | —                                                                |
| `col/mixed-outlier-labels`    | `/examples/col/mixed-outlier-labels`  | YES                | labs=                           | —                                                                |
| `col/value-labels`            | `/examples/col/value-labels`          | YES                | labs=, theme=, scales=          | —                                                                |
| `color/binned`                | `/examples/color/binned`              | YES                | labs=, theme=, scales=          | —                                                                |
| `color/continuous`            | `/examples/color/continuous`          | YES                | labs=, theme=, scales=, coord=  | —                                                                |
| `density/overlay`             | `/examples/density/overlay`           | YES                | labs=, theme=, scales=          | —                                                                |
| `errorbar/mean-se`            | `/examples/errorbar/mean-se`          | YES                | labs=, theme=, scales=          | —                                                                |
| `facet/ordered-side-strips`   | `/examples/facet/ordered-side-strips` | YES                | labs=, theme=, scales=, facet=  | —                                                                |
| `facet/wrap`                  | `/examples/facet/wrap`                | YES                | labs=, theme=, facet=           | —                                                                |
| `facet/wrap-free-y`           | `/examples/facet/wrap-free-y`         | YES                | labs=, theme=, scales=, facet=  | —                                                                |
| `histogram/basic`             | `/examples/histogram/basic`           | YES                | labs=, theme=                   | —                                                                |
| `interaction/brush-zoom`      | `/interactions/brush-zoom`            | YES                | labs=, theme=                   | exposition (not gallery); gg-demo-chrome; journey meta           |
| `interaction/facet-intervals` | `/interactions/facet-intervals`       | YES                | labs=, theme=, facet=           | exposition (not gallery); gg-demo-chrome; journey meta           |
| `interaction/legend-filter`   | `/examples/interaction/legend-filter` | YES                | labs=, theme=, scales=          | gg-demo-chrome; journey meta                                     |
| `interaction/legend-focus`    | `/examples/interaction/legend-focus`  | YES                | layers=, labs=, theme=, scales= | gg-demo-chrome; journey meta; **layers= prop**; no Geom children |
| `interaction/linked-views`    | `/interactions/linked-views`          | YES                | labs=, theme=                   | exposition (not gallery); gg-demo-chrome; journey meta           |
| `interaction/tooltip`         | `/examples/interaction/tooltip`       | YES                | labs=, theme=                   | gg-demo-chrome; journey meta                                     |
| `line/multi-series`           | `/examples/line/multi-series`         | YES                | labs=, theme=, scales=          | —                                                                |
| `line/time-axis`              | `/examples/line/time-axis`            | YES                | labs=, theme=                   | —                                                                |
| `point/canvas-scatter`        | `/examples/point/canvas-scatter`      | YES                | labs=, theme=, scales=          | —                                                                |
| `point/fixed-aspect`          | `/examples/point/fixed-aspect`        | review             | labs=, coord=                   | —                                                                |
| `point/jitter`                | `/examples/point/jitter`              | YES                | labs=, theme=                   | —                                                                |
| `point/layer-data-bands`      | `/examples/point/layer-data-bands`    | YES                | labs=                           | —                                                                |
| `point/log-scale`             | `/examples/point/log-scale`           | YES                | labs=, theme=, scales=          | —                                                                |
| `point/scatter-color`         | `/examples/point/scatter-color`       | YES                | labs=, theme=, scales=          | —                                                                |
| `point/style-scales`          | `/examples/point/style-scales`        | review             | labs=, scales=                  | —                                                                |
| `raster/grid`                 | `/examples/raster/grid`               | YES                | labs=, theme=, scales=          | —                                                                |
| `rect/regions`                | `/examples/rect/regions`              | YES                | labs=, theme=, scales=          | —                                                                |
| `ribbon/bounds`               | `/examples/ribbon/bounds`             | YES                | labs=, theme=, scales=          | —                                                                |
| `ribbon/paint`                | `/examples/ribbon/paint`              | YES                | — (geom children only?)         | no Geom children                                                 |
| `rule/annotation`             | `/examples/rule/annotation`           | YES                | labs=, theme=                   | —                                                                |
| `rule/data-driven`            | `/examples/rule/data-driven`          | YES                | labs=, theme=                   | —                                                                |
| `segment/annotations`         | `/examples/segment/annotations`       | YES                | labs=, theme=, scales=          | —                                                                |
| `smooth/loess-scatter`        | `/examples/smooth/loess-scatter`      | YES                | labs=, theme=, scales=          | —                                                                |
| `text/labels`                 | `/examples/text/labels`               | YES                | labs=, theme=, scales=          | —                                                                |
| `tile/heatmap`                | `/examples/tile/heatmap`              | YES                | labs=, theme=, scales=          | —                                                                |

## Suggested fix batches (dependency order, not calendar)

1. **Global template** (this PR): playground handoff + PortableSpec note deleted; expositions moved.
2. **High priority API**: `interaction/legend-focus` (`layers=`), then any remaining without Geom children.
3. **Prop→child sweeps by family**: Labs, Theme*, Scale*, Facet*, Coord* — one PR family or one PR per category directory.
4. **Description deletion pass**: strip `meta.json` `description` essays; regenerate manifest; leave titles factual.
5. **Re-evaluate** remaining `interaction/tooltip`, `legend-filter`, `legend-focus` gallery membership once previews are clean.

## Description text to delete (full current strings)

These are candidates for **deletion** of the page subtitle/proof line (or drastic shortening to one factual clause).

### `area/basic`

> A single filled area from the zero baseline (the theme's accent role) with a line layer tracing its upper edge — layer order is paint order. Halley's 1693 Breslau life table gives the monotone survivorship curve, and the classic theme drops the grid for black axis lines and ticks.

### `area/stacked`

> Areas stack by default: the fill groups pile from the zero baseline, showing total and composition over time. First-seen group order stays on top. Nightingale's 1858 Crimean mortality data supplies the composition, and the economist theme's tinted paper forces an explicit manual fill scale chosen for contrast against it.

### `bar/dodged`

> position dodge places the fill groups side by side within each band: groups present at an x split the band evenly (ggplot2's preserve = "total"). Edgeworth's 1885 county mortality table supplies six counties over seven years, weighted by deaths, on the few theme with tableau10.

### `bar/horizontal`

> coord: {"type": "flip"} is THE horizontal-composition mechanism: map x to the category and y to the value as usual, then flip — the band axis moves to the left (first category at the bottom, like ggplot2), the measure runs rightward, and stacking/dodging would follow. Armada squadron tonnage, pre-sorted so the flip reads smallest-up.

### `bar/proportions`

> position fill normalises each band to 1, turning counts into shares. The Armada's 1588 muster splits each squadron's complement into soldiers and sailors, weighted by men, with a manual two-key fill.

### `bar/stacked`

> position stack piles the fill groups within each band. The Trial of the Pyx supplies a real frequency table, so the weight channel makes the count stat sum counts instead of counting rows — 72 rows standing in for 10,000 sovereigns — and flexoki's eight keys map one-to-one onto the eight ordered deviation bins.

### `boxplot/by-category`

> Five-number summaries per category, with outliers past 1.5 IQR drawn individually. Michelson's five experimental runs of twenty disagree with each other more than the readings within any one of them — the reason the dataset is used to teach measurement error.

### `col/basic`

> geom col draws one bar per row at the height you supply — no statistic. Quetelet's 5,738 Scottish militiamen give the shape that made the normal curve a claim about people, under the classic theme's black axis lines and bare panel.

### `col/long-labels`

> Narrow (480px) column chart with long Spanish multi-word and German single-token category labels — exercises measured band-axis wrap/rotate/truncate layout.

### `col/mixed-outlier-labels`

> Desktop-width (640px) column chart: mostly short labels plus one four-token Spanish outlier — band planner should wrap, not fall to −90° + truncate (#634).

### `col/value-labels`

> A text layer above each column turns the bars into a table you can read directly. The 1954 Salk vaccine trial supplies the numbers the trial existed to produce: the vaccinated rate is about a third of the placebo rate.

### `color/binned`

> A quantitative color mapping split into deterministic intervals with a colorsteps guide. Color carries a third variable — how often each (actual, estimated) pairing came up across Jevons' 1,027 throws — rather than restating x or y.

### `color/continuous`

> A quantitative color mapping through the viridis sequential ramp, with a gradient ramp legend instead of discrete swatches, under coord_fixed so the map keeps its shape. A second layer draws the true positions the ramp is read against.

### `density/overlay`

> Kernel density estimates for two groups, drawn semi-transparent so the overlap stays readable. Galton's 934 adult children from 1886 give two distributions that overlap heavily but separate cleanly at the means.

### `errorbar/mean-se`

> The summary stat computes mean ± standard error per group (ggplot2's mean_se default), drawn as errorbars over the seeded-jitter raw observations — here the 1905 soporific trial that "Student" used to introduce the t-distribution.

### `facet/ordered-side-strips`

> facet.wrap.levels locks Gosset's authored A→D sample order independent of row order; labels supply human strip text; strip.position: "left" reserves a measured band beside each panel instead of above it. Fill comes from an ordinal palette scale with its legend suppressed, because the strips already name every panel.

### `facet/wrap`

> facet.wrap partitions the data BEFORE the bin stat: each panel bins its own parent-child table over one shared break grid, and fixed scales share both axes (edge axes only). The weight channel lets Pearson and Lee's published frequency table stand in for 4,892 measured children.

### `facet/wrap-free-y`

> scales: "free_y" trains the y domain per panel — Arbuthnot's four measures span five orders of magnitude, from a ratio near 1.1 to the 68,596 plague deaths of 1665, and each fills its panel at its own magnitude. Every panel gets its own left axis; x stays shared.

### `histogram/basic`

> The bin stat buckets a continuous variable and counts what lands in each bucket. Michelson's 100 speed-of-light runs from 1879 supply the distribution, and a rule at the modern accepted value shows the whole thing sitting above it: precise and biased at once.

### `interaction/brush-zoom`

> The tool rail separates rectangular selection from brush zoom. Selection reports start, change, end, and clear phases with semantic keys and domain bounds; zoom reports explicit domains and a clear event on reset, while inspection remains available alongside both. The field is the 333 complete Palmer Archipelago penguin records.

### `interaction/facet-intervals`

> Choose independent, union, or cross-panel interval semantics, then draw inside a facet. Stable panel identities keep selections attached to their facet even when rows reorder or a panel temporarily disappears. Panels are the three Palmer Archipelago islands; Biscoe holds every Gentoo, so the panels have genuinely different shapes.

### `interaction/legend-filter`

> Accessible legend checkboxes explicitly include or exclude data before statistics and scales are trained. Hidden groups remain available in the legend, and each group keeps its original color when it returns. The three series are Playfair's national debt, revenue and expenditure, 1770–1824 — the same source faceted over disjoint commodity series in facet/wrap-free-y.

### `interaction/legend-focus`

> Opt-in legend controls preview locally, commit stable row keys to a shared controller, and de-emphasize unrelated marks without changing scales, statistics, layout, or color identity. The same semantic mask drives SVG and canvas views. The three series are Playfair's stock, bread and export indices, 1770–1824, which read as both a scatter and a connected line.

### `interaction/linked-views`

> A shared Svelte 5 interaction controller coordinates semantic selection, lightweight emphasis, and zoom domains without callback loops. Stable row keys link two plots to ordinary accessible DOM, while explicit reconciliation makes data replacement predictable. Five Palmer penguins per species, evenly sampled, so every linked row fits in the table alongside the plots.

### `interaction/tooltip`

> Chart-local, private inspection state adds a semantic crosshair, a complete HTML tooltip, keyboard traversal, and click-or-Enter pinning. The concise live announcement reports the shared x value and group count once, while every member remains navigable in ordinary DOM. Measurements are the 333 complete Palmer Archipelago penguin records; flipper length is recorded to the millimetre, so many birds genuinely share an x value.

### `line/multi-series`

> One line per group, derived from the discrete color mapping — plus a point layer on top showing how layers compose. Playfair's 1821 wheat-and-wages plate supplies the two series, and a manual color scale picks the economist theme's own red and ink so both clear contrast on its tinted paper — the shorter wage series ends early because the original records no 1821 wage.

### `line/time-axis`

> A long-run series over untouched four-digit year strings. Value-driven inference selects a UTC calendar scale automatically; no preprocessing or explicit time scale is required. Bowley's 1855–99 British export series supplies the trend, drawn on the fivethirtyeight theme's newsprint paper with white gridlines.

### `point/canvas-scatter`

> Above the canvas threshold the marks render to a canvas stratum while axes, grid, and legend stay SVG. This is the one example that keeps generated data deliberately — its subject is the rendering path under load, not a dataset — and the dark theme is where overplotting at low alpha actually reads.

### `point/jitter`

> position jitter offsets overlapping marks so ties stay countable. Pearson's 1910 survey of 70 trades has many sharing a wage class, and the clean theme's dashed horizontal grid keeps the eye on the vertical spread.

### `point/layer-data-bands`

> A large observation table layered with a small background-band table and a one-row annotation table. Each geom supplies its own data; the plot has no shared table.

### `point/log-scale`

> scaleXLog10 compresses a multiplicative axis. Farr's 1849 London cholera districts span two orders of magnitude in population density, and colouring by water company separates them the way the epidemic did — the economist theme's tinted paper forces a manual three-key scale.

### `point/scatter-color`

> A discrete color mapping splits the points into groups and produces the legend. Guerry's 1833 moral statistics of France put 85 departments on the axes, coloured by region on the few theme with tableau10 — Corsica is dropped because the source gives it no region.

### `raster/grid`

> Equal-cell raster from a regular (x, y) grid with fill — dense heatmaps without per-cell strokes. The grid must be complete, so the source's 22 × 42 table is cropped to its largest complete 15 × 33 sub-rectangle.

### `rect/regions`

> Arbitrary rectangles from xmin/xmax/ymin/ymax — background time bands or regions without image injection. Two layers over two unrelated datasets, so neither inherits a plot-level mapping: the rects are Playfair's twelve reigns, the line is his wheat-price series.

### `ribbon/bounds`

> A filled band between precomputed lower and upper bounds along x — the canonical geom_ribbon contract (not a zero-baseline area). The bounds are observed rather than modelled: the smallest and largest of Halley's five annual counts at each age.

### `ribbon/paint`

> Portable within-mark linear gradients for fill and stroke plus a bounded glow, with required solid fallbacks — not theme decoration and not a data color scale.

### `rule/annotation`

> The rule geom's annotation form: fixed x/y intercepts drawn under a line layer. Annotation rules inherit no plot aes and still train the scales, exactly like ggplot2's vline/hline. Both intercepts here come from the source's own documentation — the apparatus change after Cavendish's sixth determination, and the modern value of the earth's density.

### `rule/data-driven`

> The rule geom's data-driven form: mapping aes.x (and only x) draws one vertical panel-spanning rule per row — a rug plot of the distribution. Semi-transparent strokes reveal density. Van Langren's 1644 chart, believed to be the first graph of statistical data, was exactly this.

### `segment/annotations`

> Finite data-driven segments from (x,y) to (xend,yend) — leader lines and range ticks that do not span the panel (unlike rule). Here each segment runs from a pair's self-fertilised height to its cross-fertilised one, so the direction of the segment carries Darwin's result.

### `smooth/loess-scatter`

> A loess trend (R-parity local regression, degree 2) fitted over a scatter, with its 95% confidence ribbon drawn under the line — ggplot2's geom_smooth, applied to the first scatterplot ever published. A continuous size scale carries Herschel's own weighting of each observation.

### `text/labels`

> A text layer labels each point from a data field, start-anchored and offset with dx. Labels draw exactly where they are placed — there is no collision detection — so the twelve names are staggered down the panel by rank.

### `tile/heatmap`

> Center-sized tiles on discrete x/y with fill — the ordinary heatmap contract without raster grid constraints. Fifty-three week columns against seven weekday rows lay a whole year out as a calendar.
