# Example page audit inventory

Tracking list for follow-up PRs. **Do not** treat this as shipped product copy.

Generated for the gallery/interaction structural PR that:

- Moves interaction expositions off the gallery onto `/interactions/*`
- Removes example-page playground handoff + "Local PortableSpec only…"
- Leaves per-example Svelte API + description cleanup for later PRs

## Status

- **Page subtitles (`meta.json` description)**: deleted corpus-wide (key omitted; no rewrite).
- **Svelte prop → child API**: done corpus-wide (`<Labs>`, `<Theme*>`, `<Scale*>`, `<Facet*>`, `<Coord*>`, `<Guide*>`, Geom children; no `layers=` / deprecated props).

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
| `interaction/legend-focus`    | Stays in gallery for now (child API; canvas via `<GeomPoint render="canvas" />`)        |
| Homepage featured             | Replaced `interaction/linked-views` with `point/scatter-color`                          |

## Summary counts

- Total example corpus entries: **44**
- Gallery after exclusion: **41**
- Still using deprecated GGPlot props: **0**
- Already using Geom children: **all hand-written examples** (`ribbon/paint` is `{spec}` passthrough)
- Description key present: **0** (deleted)

## Per-example checklist

| id                            | route                                 | delete description | API props → children | notes                                           |
| ----------------------------- | ------------------------------------- | ------------------ | -------------------- | ----------------------------------------------- |
| `area/basic`                  | `/examples/area/basic`                | DONE               | DONE                 | —                                               |
| `area/stacked`                | `/examples/area/stacked`              | DONE               | DONE                 | showcase (#762)                                 |
| `bar/dodged`                  | `/examples/bar/dodged`                | DONE               | DONE                 | —                                               |
| `bar/horizontal`              | `/examples/bar/horizontal`            | DONE               | DONE                 | —                                               |
| `bar/proportions`             | `/examples/bar/proportions`           | DONE               | DONE                 | showcase (#762)                                 |
| `bar/stacked`                 | `/examples/bar/stacked`               | DONE               | DONE                 | —                                               |
| `boxplot/by-category`         | `/examples/boxplot/by-category`       | DONE               | DONE                 | showcase (#762)                                 |
| `col/basic`                   | `/examples/col/basic`                 | DONE               | DONE                 | —                                               |
| `col/long-labels`             | `/examples/col/long-labels`           | DONE               | DONE                 | —                                               |
| `col/mixed-outlier-labels`    | `/examples/col/mixed-outlier-labels`  | DONE               | DONE                 | —                                               |
| `col/value-labels`            | `/examples/col/value-labels`          | DONE               | DONE                 | showcase (#762)                                 |
| `color/binned`                | `/examples/color/binned`              | DONE               | DONE                 | —                                               |
| `color/continuous`            | `/examples/color/continuous`          | DONE               | DONE                 | showcase (#762)                                 |
| `density/overlay`             | `/examples/density/overlay`           | DONE               | DONE                 | showcase (#762)                                 |
| `errorbar/mean-se`            | `/examples/errorbar/mean-se`          | DONE               | DONE                 | —                                               |
| `facet/ordered-side-strips`   | `/examples/facet/ordered-side-strips` | DONE               | DONE                 | —                                               |
| `facet/wrap`                  | `/examples/facet/wrap`                | DONE               | DONE                 | showcase (#762)                                 |
| `facet/wrap-free-y`           | `/examples/facet/wrap-free-y`         | DONE               | DONE                 | —                                               |
| `histogram/basic`             | `/examples/histogram/basic`           | DONE               | DONE                 | —                                               |
| `interaction/brush-zoom`      | `/interactions/brush-zoom`            | DONE               | DONE                 | exposition (not gallery); gg-demo-chrome        |
| `interaction/facet-intervals` | `/interactions/facet-intervals`       | DONE               | DONE                 | exposition (not gallery); gg-demo-chrome        |
| `interaction/legend-filter`   | `/examples/interaction/legend-filter` | DONE               | DONE                 | gg-demo-chrome; journey meta                    |
| `interaction/legend-focus`    | `/examples/interaction/legend-focus`  | DONE               | DONE                 | gg-demo-chrome; journey meta; canvas geom child |
| `interaction/linked-views`    | `/interactions/linked-views`          | DONE               | DONE                 | exposition (not gallery); gg-demo-chrome        |
| `interaction/tooltip`         | `/examples/interaction/tooltip`       | DONE               | DONE                 | gg-demo-chrome; journey meta                    |
| `line/multi-series`           | `/examples/line/multi-series`         | DONE               | DONE                 | —                                               |
| `line/time-axis`              | `/examples/line/time-axis`            | DONE               | DONE                 | showcase (#762)                                 |
| `point/canvas-scatter`        | `/examples/point/canvas-scatter`      | DONE               | DONE                 | —                                               |
| `point/fixed-aspect`          | `/examples/point/fixed-aspect`        | DONE               | DONE                 | —                                               |
| `point/jitter`                | `/examples/point/jitter`              | DONE               | DONE                 | —                                               |
| `point/layer-data-bands`      | `/examples/point/layer-data-bands`    | DONE               | DONE                 | —                                               |
| `point/log-scale`             | `/examples/point/log-scale`           | DONE               | DONE                 | showcase (#762)                                 |
| `point/scatter-color`         | `/examples/point/scatter-color`       | DONE               | DONE                 | —                                               |
| `point/style-scales`          | `/examples/point/style-scales`        | DONE               | DONE                 | —                                               |
| `raster/grid`                 | `/examples/raster/grid`               | DONE               | DONE                 | —                                               |
| `rect/regions`                | `/examples/rect/regions`              | DONE               | DONE                 | —                                               |
| `ribbon/bounds`               | `/examples/ribbon/bounds`             | DONE               | DONE                 | —                                               |
| `ribbon/paint`                | `/examples/ribbon/paint`              | DONE               | N/A (`{spec}`)       | passthrough form                                |
| `rule/annotation`             | `/examples/rule/annotation`           | DONE               | DONE                 | —                                               |
| `rule/data-driven`            | `/examples/rule/data-driven`          | DONE               | DONE                 | —                                               |
| `segment/annotations`         | `/examples/segment/annotations`       | DONE               | DONE                 | —                                               |
| `smooth/loess-scatter`        | `/examples/smooth/loess-scatter`      | DONE               | DONE                 | showcase (#762)                                 |
| `text/labels`                 | `/examples/text/labels`               | DONE               | DONE                 | —                                               |
| `tile/heatmap`                | `/examples/tile/heatmap`              | DONE               | DONE                 | —                                               |

## Suggested fix batches (dependency order, not calendar)

1. **Global template** (done): playground handoff + PortableSpec note deleted; expositions moved.
2. **High priority API**: `interaction/legend-focus` (`layers=` → geom children) — **done**.
3. **Prop→child sweeps by family** — **done** corpus-wide.
4. **Description deletion pass** — **done** (key omitted; regenerate manifest/routes/search).
5. **Re-evaluate** remaining `interaction/tooltip`, `legend-filter`, `legend-focus` gallery membership once previews are clean (optional product call).
