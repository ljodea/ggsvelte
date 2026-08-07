# Gallery Inspect mode inventory

**Date:** 2026-08-07
**Scope:** every `examples/**/Example.svelte` (live gallery charts)
**Related:** #1529 (re-audit after #1523), #1528 (library auto-mode advisories)

## Rules used

1. **Mode** matches mark geometry and scale type: `exact` for discrete bars/boxes/intervals; `x` for continuous shared-x series; `xy` for scatters/paths with free 2d hits.
2. **Layer eligibility:** decorative furniture (`GeomText` labels, map rivers, full-panel rects) sets `inspect={false}`.
3. **Primary hits:** prefer one primary mark family unless multi-layer inspect is intentional and quiet.
4. **Guardrail:** `scripts/example-interaction-api.test.ts` forbids freescrolling `mode="x"|"xy"` on the discrete-interval set and requires Minard opt-outs.

## Fixed in this pass

| Example                | Before                           | After                                                             |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `boxplot/violin`       | `mode="x"`                       | `mode="exact"`                                                    |
| `boxplot/by-category`  | `mode="x"`                       | `mode="exact"`                                                    |
| `errorbar/caps`        | `mode="x"`                       | `mode="exact"`                                                    |
| `errorbar/mean-se`     | `mode="x"` + inspectable jitter  | `mode="exact"` + `inspect={false}` on points                      |
| `errorbar/summary-bin` | `mode="x"` + inspectable scatter | `mode="exact"` + `inspect={false}` on points                      |
| `pointrange/midpoints` | `mode="x"`                       | `mode="exact"`                                                    |
| `linerange/stems`      | `mode="x"`                       | `mode="exact"`                                                    |
| `path/trajectory`      | all layers hit                   | rivers + text `inspect={false}`; troops/cold path+point stay live |

## Full inventory

| id                            | mode(s)                                                   | pin | inspect=false count | judgment | note                                                     |
| ----------------------------- | --------------------------------------------------------- | --- | ------------------- | -------- | -------------------------------------------------------- |
| `area/basic`                  | `x`                                                       | yes | 0                   | pass     |                                                          |
| `area/stacked`                | `x`                                                       | yes | 0                   | pass     |                                                          |
| `bar/dodged`                  | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `bar/horizontal`              | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `bar/proportions`             | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `bar/stacked`                 | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `bin2d/basic`                 | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `blank/axes-only`             | `—`                                                       | —   | 0                   | n/a      | no hit targets                                           |
| `blank/domain-expand`         | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `boxplot/by-category`         | `exact`                                                   | yes | 0                   | fixed    | mode/hit hygiene corrected                               |
| `boxplot/violin`              | `exact`                                                   | yes | 0                   | fixed    | mode/hit hygiene corrected                               |
| `col/basic`                   | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `col/long-labels`             | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `col/mixed-outlier-labels`    | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `col/theme-linedraw`          | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `col/value-labels`            | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `color/binned`                | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `contour/basic`               | `x`                                                       | yes | 0                   | pass     |                                                          |
| `crossbar/boxes`              | `x`                                                       | yes | 0                   | pass     | mode=x allowlisted (category-center snap)                |
| `curve/connectors`            | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `density/kde-2d`              | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `density/kde-2d-filled`       | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `density/overlay`             | `x`                                                       | yes | 0                   | pass     | continuous multi-series; mode=x is correct comparison UX |
| `dotplot/histodot`            | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `errorbar/caps`               | `exact`                                                   | yes | 0                   | fixed    | mode/hit hygiene corrected                               |
| `errorbar/mean-se`            | `exact`                                                   | yes | 1                   | fixed    | mode/hit hygiene corrected                               |
| `errorbar/summary-bin`        | `exact`                                                   | yes | 1                   | fixed    | mode/hit hygiene corrected                               |
| `facet/ordered-side-strips`   | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `facet/wrap`                  | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `facet/wrap-free-y`           | `x`                                                       | yes | 0                   | pass     |                                                          |
| `freqpoly/basic`              | `x`                                                       | yes | 0                   | pass     |                                                          |
| `hex/basic`                   | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `histogram/basic`             | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `hline/threshold`             | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `interaction/brush-zoom`      | `(default)`                                               | no  | 0                   | pass     |                                                          |
| `interaction/facet-intervals` | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `interaction/legend-filter`   | `x`                                                       | yes | 0                   | pass     |                                                          |
| `interaction/legend-focus`    | `xy maxDistance=24; xy maxDistance=24; xy maxDistance=24` | yes | 0                   | pass     |                                                          |
| `interaction/linked-views`    | `xy maxDistance=24; xy maxDistance=24`                    | yes | 0                   | pass     |                                                          |
| `interaction/tooltip`         | `x maxDistance=24`                                        | yes | 0                   | pass     |                                                          |
| `jitter/basic`                | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `jitter/spread`               | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `label/basic`                 | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `line/ecdf`                   | `x`                                                       | yes | 0                   | pass     |                                                          |
| `line/function`               | `x`                                                       | yes | 0                   | pass     |                                                          |
| `line/multi-series`           | `x`                                                       | yes | 0                   | pass     |                                                          |
| `line/time-axis`              | `x`                                                       | yes | 0                   | pass     |                                                          |
| `linerange/stems`             | `exact`                                                   | yes | 0                   | fixed    | mode/hit hygiene corrected                               |
| `map/choropleth`              | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `path/connect-hv`             | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `path/ellipse-rings`          | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `path/trajectory`             | `xy maxDistance=24; xy maxDistance=24`                    | yes | 4                   | fixed    | mode/hit hygiene corrected                               |
| `point/abline-identity`       | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/count`                 | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `point/fixed-aspect`          | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/gradient-continuous`   | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/hue-discrete`          | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/jitter`                | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/layer-data-bands`      | `x`                                                       | yes | 0                   | pass     |                                                          |
| `point/log-scale`             | `xy`                                                      | yes | 0                   | pass     |                                                          |
| `point/quantile-lines`        | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/scatter-color`         | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/stat-manual-mean`      | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/stat-unique`           | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/steps-binned`          | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `point/void-chrome`           | `x`                                                       | yes | 0                   | pass     |                                                          |
| `pointrange/midpoints`        | `exact`                                                   | yes | 0                   | fixed    | mode/hit hygiene corrected                               |
| `polygon/regions`             | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `qq_line/match`               | `x`                                                       | yes | 0                   | pass     |                                                          |
| `qq/cloud`                    | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `qq/normal`                   | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `raster/grid`                 | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `rect/regions`                | `x`                                                       | yes | 0                   | pass     |                                                          |
| `ribbon/bounds`               | `x`                                                       | yes | 0                   | pass     |                                                          |
| `ribbon/paint`                | `x`                                                       | yes | 0                   | pass     |                                                          |
| `rug/ticks`                   | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `rule/annotation`             | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `rule/data-driven`            | `x`                                                       | yes | 0                   | pass     |                                                          |
| `segment/annotations`         | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `sf/basic`                    | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `sf/boxed-labels`             | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `sf/geometry-collection`      | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `sf/holes`                    | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `sf/labels`                   | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `showcase/kyoto-sakura`       | `xy maxDistance=24`                                       | yes | 6                   | pass     |                                                          |
| `smooth/loess-scatter`        | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `spoke/rays`                  | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `spoke/vector-field`          | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `step/ecdf`                   | `x`                                                       | yes | 0                   | pass     |                                                          |
| `step/stairs`                 | `x`                                                       | yes | 0                   | pass     |                                                          |
| `text/labels`                 | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |
| `tile/heatmap`                | `exact`                                                   | yes | 0                   | pass     |                                                          |
| `vline/cutoff`                | `xy maxDistance=24`                                       | yes | 0                   | pass     |                                                          |

## Follow-ups

- Library auto-mode + advisories for violin/interval geoms: #1528
- Density tooltip series-centric field quality (mode kept as `x`; content quality is separate)
- Skill guidance for mode selection: #1530
