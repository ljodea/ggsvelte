# Example dataset reselection (TidyTuesday)

**Date:** 2026-08-01  
**Companion:** `docs/audits/example-slop-audit.md`  
**Scope:** replace the worst history-of-stats / AI-slop examples with politically neutral, desire-led datasets from the local TidyTuesday clone (`~/Code/tidytuesday`). TidyTuesday curated tables are **CC0 1.0**; primary measurement sources are credited in `NOTICE` and each `*_CITATION` export.

## Keep list (do not swap data)

| Example / data                                                                                                                 | Why keep                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Minard march / debt / style channels (`path/trajectory`, `path/connect-hv`, `point/style-scales`, `point/layer-data-bands`, …) | Path narrative is excellent; user asked to leave Minard |
| Kyoto sakura (`kyotoSakura` + any lesson charts)                                                                               | Real Tufte teaching series already bundled              |
| Snow cholera maps / KDE / pumps (`density/kde-2d*`, `map/choropleth`, `polygon/regions`, `sf/labels`, …)                       | Canonical spatial story; visually strong                |
| Playfair / Nightingale where the chart form _is_ the lesson                                                                    | Defer to a later copy-only pass                         |

Everything else is fair game for data swap or copy rewrite.

## Selection criteria

1. **Politically neutral** — food, recreation, sports equipment packaging, natural science scores; no crime-of-persons, war, or election frames for the first cut.
2. **Desire test** — a Svelte developer should look at the chart and want that geom pattern in their app (Lulu vector adapted for FOSS docs: audience → action → belief).
3. **Visual density** — enough points or clear series that the preview is not a sparse gray mush.
4. **License** — TidyTuesday CC0 curation + primary-source citation in NOTICE.
5. **Package shape** — small enough for `@ggsvelte/svelte/data` (slim columns, no description blobs).

## Bundled datasets added

| Export           | Rows  | TidyTuesday week | Primary source         | Best chart shapes                             |
| ---------------- | ----- | ---------------- | ---------------------- | --------------------------------------------- |
| `chocolateBars`  | 2,530 | 2022-01-18       | Flavors of Cacao       | scatter, loess, heatmap grid                  |
| `coffeeRatings`  | 1,338 | 2020-07-07       | CQI / James LeDoux     | rug, density, aroma–flavor scatter, quantiles |
| `beerProduction` | 36    | 2020-03-31       | US TTB national totals | dodged multi-series bars                      |
| `fastfoodMenu`   | 515   | 2018-09-04       | fastfoodnutrition.org  | jittered category scatter                     |

Files: `packages/svelte/src/lib/data/{chocolate-bars,coffee-ratings,beer-production,fastfood-menu}.ts` and matching `apps/docs/static/*.json`.

## Examples rewritten in this pass

| id                     | Was                                         | Now                                   | Copy direction            |
| ---------------------- | ------------------------------------------- | ------------------------------------- | ------------------------- |
| `smooth/loess-scatter` | Herschel γ Virginis (14 pts, formula title) | `chocolateBars` cocoa % × rating      | Capability + what you see |
| `rule/data-driven`     | Van Langren longitude rug                   | `coffeeRatings` total cup points rug  | What the mark is          |
| `raster/grid`          | Macdonell criminals stature grid            | chocolate cocoa × rating counts       | Where the mass sits       |
| `bar/dodged`           | Edgeworth county deaths                     | `beerProduction` package type × year  | Side-by-side comparison   |
| `jitter/basic`         | Pearson 1910 wages                          | `fastfoodMenu` calories by restaurant | Overplotting fix          |
| `point/jitter`         | same wages, position sugar                  | same fast-food table                  | Paired with jitter/basic  |
| `point/quantile-lines` | Fiji quakes (kept in hex/basic)             | coffee aroma × flavor quantiles       | Spread of y given x       |

## Intentionally not rewritten here

Critical/high copy still on keep-list or deferred to a **copy-only** pass (no data change):

- Snow / Minard / Playfair / Nightingale / sakura
- Remaining HistData formula titles with ok visuals (Michelson, Cavendish, Galton, …) — rewrite titles/subtitles only in a follow-up PR
- Interaction examples that already use penguins (copy polish only)

## Next PR (regroup)

1. Copy-only rewrite of surviving history-first titles under Liam writing rules + Lulu desire test.
2. Optional further data swaps for medium-severity weak visuals (`bar/horizontal`, `rect/regions`, Armada, …).
3. Recapture gallery lights for any example still showing stale previews after this merge.
