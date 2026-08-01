# Example copy & visual slop audit

**Date:** 2026-08-01  
**Scope:** all 85 `examples/**/Example.svelte` entries (chart `Labs`, page `manifest.ts` title/description, code-block parity, local preview PNGs in `apps/docs/static/previews/`)  
**Live routes:** `<https://ggsvelte.sh/examples>/<id>` (previews cover every example; no missing PNGs)  
**Lenses:** `/liam-writing-rules` + copy-mistakes modes; `/lulu` adapted for FOSS (audience → action → belief; strip inauthentic pastiche voice; no founder cosplay needed)

---

## Diagnosis (root cause)

This is not a one-off bad string. Almost every example was written under the same recipe:

1. Pick a classic statistics-history dataset (HistData / Nightingale / Playfair / Snow / Cavendish / …).
2. Title it as a **compressed historic statement** (`The first scatterplot, redrawn`; `779 rows of war, 321 marks`; `X, Y`).
3. Subtitle it as **one breathless insider line** that assumes the reader already knows the person, the object, and why it matters — then packs method, year, and a moral into the same clause.
4. Repeat the same title/subtitle inside chart `Labs` **and** the page-level manifest **and** the docs code block.

**Audience mismatch.** The reader of an example page is a Svelte developer who wants a chart they would ship. The copy addresses a history-of-stats seminar. Lulu’s vector test fails: the objective (make someone want this geom) never connects to an action (copy this pattern into my app). Name-drops without teaching who or why are inauthentic voice — pastiche erudition, not craft.

**User’s stated pet peeve (verified as systemic):** the formula `Something, thing` used as a bold maximal compression. Example of record: `smooth/loess-scatter` — title _The first scatterplot, redrawn_; subtitle about Herschel / γ Virginis / hand-fitted curves. The preview is also visually weak (gray confidence mush, ~12 points).

### Failure modes used in this audit

| Code              | Meaning                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **formula**       | Comma-compression / firstism / maximal-density headline (`X, Y` where Y is a punch, not a year)               |
| **history-first** | Leads with person/year/era instead of the chart capability the reader came for                                |
| **over-subtitle** | Over-compressed subtitle: multi-clause, em-dash cleverness, unearned moral, or API leak (`geom_*`, `theme_*`) |
| **insider**       | Assumes reader knows Herschel, γ Virginis, Van Langren, Edgeworth, haemacytometer, Pyx, pataches, …           |
| **chart-labs**    | Chart title/subtitle (and therefore code sample) also carry the slop — not only the page chrome               |
| **visual**        | attractive / ok / weak / ugly from local `apps/docs/static/previews/*-light.png`                              |

Copy-mistakes crosswalk: **wrong surface** (API names in human titles), **fake findings** / unearned morals, **importance inflation** via historic gravitas, **soft teaching** of statistics history on a product gallery.

---

## Scoreboard

| Metric                                  | Count / 85       |
| --------------------------------------- | ---------------- |
| **formula** headline (page or chart)    | 22               |
| **history-first** title                 | 45               |
| **over-compressed** subtitle/desc       | 43               |
| **insider** name-drop / jargon          | 21               |
| **chart Labs** also guilty              | 59               |
| Severity critical / high / medium / low | 4 / 37 / 35 / 9  |
| Visual attractive / ok / weak / ugly    | 44 / 21 / 17 / 3 |

**Worst intersection (critical/high copy + weak/ugly visual):**

- `rule/data-driven` — copy **critical**, visual **ugly**
- `smooth/loess-scatter` — copy **critical**, visual **ugly**
- `bar/dodged` — copy **high**, visual **weak**
- `interaction/facet-intervals` — copy **high**, visual **weak**
- `interaction/linked-views` — copy **high**, visual **weak**
- `jitter/basic` — copy **high**, visual **weak**
- `point/jitter` — copy **high**, visual **weak**
- `point/quantile-lines` — copy **high**, visual **weak**
- `point/style-scales` — copy **high**, visual **weak**
- `sf/geometry-collection` — copy **high**, visual **weak**

---

## Full index (severity × visual)

| id                            | severity | visual     | formula? | over-sub? | chart-labs? | chart title                                                                                                                           |
| ----------------------------- | -------- | ---------- | -------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `rule/data-driven`            | critical | ugly       | Y        | Y         | Y           | The first statistical graph was a rug                                                                                                 |
| `smooth/loess-scatter`        | critical | ugly       | Y        | Y         | Y           | The first scatterplot, redrawn                                                                                                        |
| `density/kde-2d`              | critical | attractive | Y        | Y         | Y           | Snow's cholera deaths close on one pump                                                                                               |
| `raster/grid`                 | critical | attractive | Y        | Y         | Y           | Three thousand criminals, measured                                                                                                    |
| `bar/dodged`                  | high     | weak       |          | Y         | Y           | Deaths in six English counties, 1876–82                                                                                               |
| `interaction/facet-intervals` | high     | weak       | Y        |           | Y           | Palmer penguins by island                                                                                                             |
| `interaction/linked-views`    | high     | weak       | Y        |           | Y           | Select in either view                                                                                                                 |
| `jitter/basic`                | high     | weak       |          | Y         | Y           | Wages across 70 trades, 1910                                                                                                          |
| `point/jitter`                | high     | weak       | Y        | Y         | Y           | The same wages, jittered by position                                                                                                  |
| `point/quantile-lines`        | high     | weak       | Y        |           | Y           | How strong an earthquake gets, by how deep it is                                                                                      |
| `point/style-scales`          | high     | weak       |          | Y         | Y           | Minard's march on five style channels                                                                                                 |
| `sf/geometry-collection`      | high     | weak       | Y        |           | Y           | One feature, two pieces of ground                                                                                                     |
| `boxplot/violin`              | high     | attractive |          | Y         | Y           | Michelson's five runs, 1879 — violin view                                                                                             |
| `col/theme-linedraw`          | high     | attractive |          | Y         | Y           | Chests of 5,738 Scottish soldiers                                                                                                     |
| `color/continuous`            | high     | attractive |          | Y         | Y           | Eleven maps of the Great Lakes, 1688–1818                                                                                             |
| `contour/basic`               | high     | ok         | Y        |           | Y           | Maunga Whau, height by height                                                                                                         |
| `curve/connectors`            | high     | ok         | Y        | Y         | Y           | Darwin's maize, curved                                                                                                                |
| `density/overlay`             | high     | attractive |          | Y         | Y           | Heights of Galton's 934 adult children                                                                                                |
| `dotplot/histodot`            | high     | ok         |          | Y         | Y           | Cavendish weighs the world, 29 times                                                                                                  |
| `errorbar/summary-bin`        | high     | attractive |          | Y         | Y           | Galton's children regress towards the middle                                                                                          |
| `facet/wrap`                  | high     | ok         | Y        | Y         | Y           | 4,892 English children, measured by Pearson and Lee                                                                                   |
| `facet/wrap-free-y`           | high     | attractive |          | Y         | Y           | London's bills of mortality, 1629–1710                                                                                                |
| `histogram/basic`             | high     | attractive |          | Y         | Y           | Michelson measures the speed of light, 1879                                                                                           |
| `hline/threshold`             | high     | ok         |          | Y         | Y           | Cavendish weighs the world, 1798                                                                                                      |
| `interaction/tooltip`         | high     | attractive | Y        | Y         | Y           | Inspect a shared x value, then pin                                                                                                    |
| `label/basic`                 | high     | attractive | Y        |           | Y           | Every name on the first statistical graph, boxed                                                                                      |
| `path/ellipse-rings`          | high     | attractive | Y        |           | Y           | Three penguins, three ellipses                                                                                                        |
| `path/trajectory`             | high     | attractive | Y        |           | Y           | Napoleon's army marches east and dies coming back                                                                                     |
| `point/count`                 | high     | attractive |          | Y         | Y           | 928 heights, 102 places to put them                                                                                                   |
| `point/gradient-continuous`   | high     | attractive | Y        | Y         | Y           | Forty-three years of one register, stacked by month                                                                                   |
| `point/scatter-color`         | high     | attractive |          | Y         | Y           | Literacy and crime in France, 1833                                                                                                    |
| `point/stat-manual-mean`      | high     | attractive | Y        | Y         | Y           | Michelson's five runs, and where each settled                                                                                         |
| `point/void-chrome`           | high     | attractive |          | Y         | Y           | British exports, 1855 to 1899, as a sparkline                                                                                         |
| `ribbon/bounds`               | high     | attractive |          | Y         | Y           | Halley's Breslau burials, 1687–1691                                                                                                   |
| `ribbon/paint`                | high     | ok         | Y        |           | Y           | What a ribbon can be painted with                                                                                                     |
| `segment/annotations`         | high     | attractive |          | Y         | Y           | Darwin's maize, 1876                                                                                                                  |
| `sf/boxed-labels`             | high     | ok         | Y        | Y         | Y           | The same names, on paper                                                                                                              |
| `sf/labels`                   | high     | ok         | Y        |           | Y           | Every pump in Snow's Soho, named                                                                                                      |
| `step/ecdf`                   | high     | ok         | Y        | Y         | Y           | Darwin's fifteen pairs of maize                                                                                                       |
| `tile/heatmap`                | high     | attractive |          | Y         | Y           | Cholera in England and Wales, 1849                                                                                                    |
| `vline/cutoff`                | high     | attractive |          | Y         | Y           | Cavendish weighs the world, 1798                                                                                                      |
| `blank/axes-only`             | medium   | ugly       |          | Y         | Y           | The frame before the chart                                                                                                            |
| `bar/horizontal`              | medium   | weak       |          |           |             | Armada tonnage by squadron, 1588                                                                                                      |
| `point/fixed-aspect`          | medium   | weak       |          | Y         | Y           | Equal units stay circular                                                                                                             |
| `point/hue-discrete`          | medium   | weak       |          | Y         | Y           | How the Armada was loaded                                                                                                             |
| `point/stat-unique`           | medium   | weak       |          |           |             | 779 rows of war, 321 marks                                                                                                            |
| `point/steps-binned`          | medium   | weak       |          | Y         | Y           | Cholera fell away with height above the Thames                                                                                        |
| `rect/regions`                | medium   | weak       |          | Y         | Y           | The price of wheat under twelve reigns                                                                                                |
| `spoke/vector-field`          | medium   | weak       |          | Y         | Y           | Which way the water runs off Maunga Whau                                                                                              |
| `area/basic`                  | medium   | attractive |          |           | Y           | Halley's life table, 1693                                                                                                             |
| `area/stacked`                | medium   | attractive |          |           |             | Deaths in the Crimea, 1854–56                                                                                                         |
| `bar/proportions`             | medium   | attractive |          |           | Y           | Who sailed with the Armada, 1588                                                                                                      |
| `bar/stacked`                 | medium   | ok         |          |           | Y           | The Trial of the Pyx, 1848                                                                                                            |
| `boxplot/by-category`         | medium   | ok         |          |           |             | Michelson's five runs, 1879                                                                                                           |
| `col/basic`                   | medium   | attractive |          |           | Y           | Chests of 5,738 Scottish soldiers                                                                                                     |
| `col/value-labels`            | medium   | attractive |          |           |             | The Salk vaccine field trial, 1954                                                                                                    |
| `color/binned`                | medium   | attractive |          | Y         | Y           | How many beans can you see at once?                                                                                                   |
| `density/kde-2d-filled`       | medium   | attractive |          | Y         | Y           | The same deaths as filled bands                                                                                                       |
| `errorbar/mean-se`            | medium   | ok         |          |           |             | The data the t-test was invented on                                                                                                   |
| `facet/ordered-side-strips`   | medium   | attractive |          |           |             | Counting yeast under a microscope                                                                                                     |
| `freqpoly/basic`              | medium   | ok         |          |           |             | Michelson measures the speed of light, 1879                                                                                           |
| `interaction/brush-zoom`      | medium   | attractive |          | Y         | Y           | Select an interval or brush to zoom                                                                                                   |
| `interaction/legend-filter`   | medium   | attractive |          |           |             | Playfair's fiscal three, 1770–1824                                                                                                    |
| `line/ecdf`                   | medium   | ok         |          |           |             | How deadly was the average quarrel?                                                                                                   |
| `line/function`               | medium   | attractive |          |           | Y           | Quetelet's soldiers and the error curve                                                                                               |
| `line/multi-series`           | medium   | attractive |          |           |             | Playfair's wheat and wages, 1565–1821                                                                                                 |
| `line/time-axis`              | medium   | ok         |          |           |             | British and Irish exports, 1855–1899                                                                                                  |
| `map/choropleth`              | medium   | attractive |          |           | Y           | 359 of 578 deaths were nearest the Broad Street pump                                                                                  |
| `path/connect-hv`             | medium   | ok         |          |           |             | The cold Minard drew under the retreat                                                                                                |
| `point/abline-identity`       | medium   | ok         |          |           |             | One drug beat the other for ten of eleven patients                                                                                    |
| `point/canvas-scatter`        | medium   | attractive |          | Y         | Y           | Above the automatic threshold the marks go to canvas instead of SVG; the cloud is seeded, because the subject here is the render path |
| `point/log-scale`             | medium   | attractive |          |           |             | Cholera, crowding and water in London, 1849                                                                                           |
| `qq/normal`                   | medium   | ok         |          |           |             | Were Michelson's errors normal?                                                                                                       |
| `rule/annotation`             | medium   | attractive |          |           |             | Cavendish weighs the world, 1798                                                                                                      |
| `sf/holes`                    | medium   | attractive |          | Y         | Y           | Two bands of the same hillside                                                                                                        |
| `text/labels`                 | medium   | ok         |          | Y         | Y           | Every name on the first statistical graph                                                                                             |
| `blank/domain-expand`         | low      | weak       |          |           |             | Five and a half times the density of water                                                                                            |
| `interaction/legend-focus`    | low      | weak       |          |           |             | SVG points                                                                                                                            |
| `bin2d/basic`                 | low      | attractive |          |           |             | Old Faithful erupts two ways                                                                                                          |
| `col/long-labels`             | low      | ok         |          |           |             | Long category labels at a narrow width                                                                                                |
| `col/mixed-outlier-labels`    | low      | ok         |          |           |             | One long label among short ones                                                                                                       |
| `hex/basic`                   | low      | attractive |          |           |             | A thousand earthquakes off Fiji                                                                                                       |
| `point/layer-data-bands`      | low      | attractive |          |           |             | What the wars did to the national debt                                                                                                |
| `polygon/regions`             | low      | attractive |          |           |             | Which pump was nearest                                                                                                                |
| `sf/basic`                    | low      | attractive |          |           |             | Maunga Whau as three simple features                                                                                                  |

## Per-example notes

For each: page title + description (manifest), chart Labs title + subtitle, flags, visual verdict. Preview path is always `apps/docs/static/previews/<id-with-hyphens>-light.png`.

### `area/basic`

- **Severity:** medium · **Visual:** attractive — Clean blue wedge, strong shape
- **Flags:** history-first, insider, chart-labs
- **Page title:** Halley's life table, 1693
- **Page description:** Survivors from a cohort of a thousand born in Breslau, drawn as the filled area the first life table implies.
- **Chart title:** Halley's life table, 1693
- **Chart subtitle:** Survivors from a cohort of 1,000 born in Breslau
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `area/stacked`

- **Severity:** medium · **Visual:** attractive — Dramatic Crimea spike, clear stacks
- **Flags:** history-first
- **Page title:** Deaths in the Crimea, 1854 to 1856
- **Page description:** Nightingale's monthly army deaths split by cause. Disease dwarfs combat until the Sanitary Commission arrives, then collapses.
- **Chart title:** Deaths in the Crimea, 1854–56
- **Chart subtitle:** Annual rate per 1,000 — disease dwarfs combat, then collapses
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `bar/dodged`

- **Severity:** high · **Visual:** weak — Rainbow sticks, same heights, visual noise
- **Flags:** history-first, over-subtitle, insider, chart-labs
- **Page title:** Deaths in six English counties, 1876 to 1882
- **Page description:** The two-way table Edgeworth used to develop the analysis of variance, drawn as side-by-side bars decades before Fisher named the method.
- **Chart title:** Deaths in six English counties, 1876–82
- **Chart subtitle:** Edgeworth's two-way table, decades before Fisher named the method
- **Notes:** Over-compression: clever moral / unearned punchline Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `bar/horizontal`

- **Severity:** medium · **Visual:** weak — Flat mono blue; near-zero stubs look broken
- **Flags:** history-first
- **Page title:** Armada tonnage by squadron, 1588
- **Page description:** The Spanish fleet's tonnage from the muster before it sailed, flipped so the category labels read across and the order runs bottom-up.
- **Chart title:** Armada tonnage by squadron, 1588
- **Chart subtitle:** Ordered smallest to largest, so coord flip reads bottom-up
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `bar/proportions`

- **Severity:** medium · **Visual:** attractive — 100% stacks read instantly
- **Flags:** history-first, insider, chart-labs
- **Page title:** Who sailed with the Armada, 1588
- **Page description:** Soldiers against sailors in each squadron as a share of the men aboard. They outnumber the sailors everywhere except the galleys and the light pataches.
- **Chart title:** Who sailed with the Armada, 1588
- **Chart subtitle:** Soldiers outnumber sailors everywhere except the galleys and the light pataches
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `bar/stacked`

- **Severity:** medium · **Visual:** ok — Story fine; 8-color rainbow muddy
- **Flags:** history-first, insider, chart-labs
- **Page title:** The Trial of the Pyx, 1848
- **Page description:** Ten thousand gold sovereigns drawn from the Royal Mint and weighed, each bag stacked by how far its coins deviated from the standard.
- **Chart title:** The Trial of the Pyx, 1848
- **Chart subtitle:** Each bag of 1,000 sovereigns, split by deviation from standard weight
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `bin2d/basic`

- **Severity:** low · **Visual:** attractive — Two clear clusters, viridis hotspots
- **Flags:** clean-ish
- **Page title:** Old Faithful's two eruption modes
- **Page description:** Eruption length against the wait that follows, counted into rectangular cells: the Yellowstone geyser has a short mode and a long one, and little in between.
- **Chart title:** Old Faithful erupts two ways
- **Chart subtitle:** 272 eruptions counted into a grid of cells: short then soon, or long then late
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `blank/axes-only`

- **Severity:** medium · **Visual:** ugly — Empty white void — fatal as gallery tile
- **Flags:** over-subtitle, chart-labs
- **Page title:** The frame before the chart
- **Page description:** Two corner rows fix the axes of Halley's life table and draw nothing, which is how a panel keeps another chart's scale or holds its shape before the data arrives.
- **Chart title:** The frame before the chart
- **Chart subtitle:** Two corner rows pin the axes of Halley's life table; nothing is drawn on them
- **Notes:** Over-compression: semicolon-packed history; clever moral / unearned punchline

### `blank/domain-expand`

- **Severity:** low · **Visual:** weak — Dots stuck top third; dead axis
- **Flags:** clean-ish
- **Page title:** Opening the axis down to water
- **Page description:** Cavendish's twenty-nine readings cover one unit, so on their own they say nothing about the claim they were made for. A blank row at water's density fixes that.
- **Chart title:** Five and a half times the density of water
- **Chart subtitle:** A blank row at water's own density opens the axis down to 1
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `boxplot/by-category`

- **Severity:** medium · **Visual:** ok — Readable, sterile black on white
- **Flags:** history-first
- **Page title:** Michelson's five runs, 1879
- **Page description:** Twenty speed-of-light measurements per run. The boxes show that the runs disagree with each other more than the readings within any one of them.
- **Chart title:** Michelson's five runs, 1879
- **Chart subtitle:** Twenty measurements each — the runs disagree more than the readings within them
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `boxplot/violin`

- **Severity:** high · **Visual:** attractive — Filled colored shapes, clear form
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Michelson's five runs as violins
- **Page description:** The same hundred measurements with a mirrored kernel density per run, so the shape of each block of twenty is visible rather than summarised.
- **Chart title:** Michelson's five runs, 1879 — violin view
- **Chart subtitle:** Mirrored kernel density of velocity per run (geom_violin)
- **Notes:** Over-compression: API leak in user copy History-first: date/person lead steals the slot that should sell the geom.

### `col/basic`

- **Severity:** medium · **Visual:** attractive — Full bell, good ink density
- **Flags:** history-first, insider, chart-labs
- **Page title:** Chests of 5,738 Scottish soldiers
- **Page description:** The measurements Quetelet used to argue that human variation follows the astronomers' error curve, and so the data behind the average man.
- **Chart title:** Chests of 5,738 Scottish soldiers
- **Chart subtitle:** The measurements that made the normal curve a claim about people
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `col/long-labels`

- **Severity:** low · **Visual:** ok — Stress-test labels, not a hero
- **Flags:** clean-ish
- **Page title:** Long category labels at a narrow width
- **Page description:** A layout specimen: Spanish multi-word names and a long German compound at about 480px, where the band axis has to wrap and rotate to fit.
- **Chart title:** Long category labels at a narrow width
- **Chart subtitle:** The band axis has to wrap and rotate to fit these names at 480px
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `col/mixed-outlier-labels`

- **Severity:** low · **Visual:** ok — Clean bars; layout specimen
- **Flags:** clean-ish
- **Page title:** One long label among short ones
- **Page description:** A layout specimen: short categories with a single four-word outlier at a normal desktop width, where the axis should wrap rather than rotate everything.
- **Chart title:** One long label among short ones
- **Chart subtitle:** At a normal panel width the axis should wrap the outlier, not rotate every label
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `col/theme-linedraw`

- **Severity:** high · **Visual:** attractive — Bold black + full grid
- **Flags:** history-first, over-subtitle, insider, chart-labs
- **Page title:** The same chests under theme_linedraw
- **Page description:** Quetelet's chest measurements again, so the black grid and border of theme_linedraw can be compared against the default and classic chrome.
- **Chart title:** Chests of 5,738 Scottish soldiers
- **Chart subtitle:** theme_linedraw — black grid and border on white panel
- **Notes:** Over-compression: API leak in user copy Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `col/value-labels`

- **Severity:** medium · **Visual:** attractive — Three punchy bars + numbers
- **Flags:** history-first
- **Page title:** The Salk vaccine field trial, 1954
- **Page description:** Paralytic polio per 100,000 children in the randomised arm, with the rate printed on each column because that number is the result.
- **Chart title:** The Salk vaccine field trial, 1954
- **Chart subtitle:** Paralytic polio per 100,000 children in the randomised arm
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `color/binned`

- **Severity:** medium · **Visual:** attractive — Green ramp, readable overplotting
- **Flags:** over-subtitle, insider, chart-labs
- **Page title:** How many beans can you see at once?
- **Page description:** Jevons threw beans into a box 1,027 times and guessed the count without pausing. He was never wrong up to four, and increasingly wrong above it.
- **Chart title:** How many beans can you see at once?
- **Chart subtitle:** Jevons threw beans into a box 1,027 times — never wrong up to four
- **Notes:** Over-compression: em-dash insider stack Insider: assumes named people/objects are already known.

### `color/continuous`

- **Severity:** high · **Visual:** attractive — Dark field + viridis + white truth marks
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Eleven maps of the Great Lakes, 1688 to 1818
- **Page description:** Thirty-nine identifiable points read off each old map against their true positions, with map year on a continuous colour ramp.
- **Chart title:** Eleven maps of the Great Lakes, 1688–1818
- **Chart subtitle:** White crosses are the 39 true positions; each dot is one map's attempt at one of them
- **Notes:** Over-compression: semicolon-packed history History-first: date/person lead steals the slot that should sell the geom.

### `contour/basic`

- **Severity:** high · **Visual:** ok — Clean topo, bare monochrome
- **Flags:** formula, chart-labs
- **Page title:** Maunga Whau in contour lines
- **Page description:** Heights across an Auckland volcano, drawn the way a topographic map draws them: rings of equal height, closing on the crater.
- **Chart title:** Maunga Whau, height by height
- **Chart subtitle:** Ten levels between 94 m and 191 m, each drawn as a line of equal height
- **Notes:** Formula: comma-formula: "Maunga Whau, height by height"

### `curve/connectors`

- **Severity:** high · **Visual:** ok — Distinctive arcs, quiet thin marks
- **Flags:** formula, history-first, over-subtitle, chart-labs
- **Page title:** Darwin's maize, curved
- **Page description:** Fifteen pairs of seedlings, one cross-fertilised and one self-fertilised, joined by a curve running from the self-fertilised height to the crossed one.
- **Chart title:** Darwin's maize, curved
- **Chart subtitle:** Fifteen pairs; each curve runs self → cross (geom_curve)
- **Notes:** Formula: comma-formula: "Darwin's maize, curved" Over-compression: API leak in user copy
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `density/kde-2d`

- **Severity:** critical · **Visual:** attractive — Classic Snow map, clear
- **Flags:** formula, history-first, over-subtitle, insider, chart-labs
- **Page title:** Snow's cholera deaths, contoured
- **Page description:** A kernel density over the 578 deaths of the 1854 Soho outbreak. The isolines close around Broad Street, where Snow said the pump was.
- **Chart title:** Snow's cholera deaths close on one pump
- **Chart subtitle:** 578 deaths in Soho, September 1854; red crosses are the 13 public pumps
- **Notes:** Formula: comma-formula: "Snow's cholera deaths, contoured" Over-compression: semicolon-packed history Insider: assumes named people/objects are already known.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `density/kde-2d-filled`

- **Severity:** medium · **Visual:** attractive — Hot core + cool rings
- **Flags:** over-subtitle, insider, chart-labs
- **Page title:** Cholera deaths as filled density bands
- **Page description:** The same 1854 Soho map, with the density drawn as closed bands rather than lines: the darkest band covers the streets fed by the Broad Street pump.
- **Chart title:** The same deaths as filled bands
- **Chart subtitle:** Closed density rings shaded by level; red crosses are the Soho pumps
- **Notes:** Over-compression: semicolon-packed history Insider: assumes named people/objects are already known.

### `density/overlay`

- **Severity:** high · **Visual:** attractive — Soft overlap, balanced
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Heights of Galton's 934 adult children
- **Page description:** Two overlapping distributions that share most of their range and separate at the means, which is the cleanest small case for overlaid densities.
- **Chart title:** Heights of Galton's 934 adult children
- **Chart subtitle:** Two overlapping distributions, separated at the means
- **Notes:** Over-compression: clever moral / unearned punchline History-first: date/person lead steals the slot that should sell the geom.

### `dotplot/histodot`

- **Severity:** high · **Visual:** ok — Honest stack; little color interest
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Cavendish weighs the world
- **Page description:** Twenty-nine torsion-balance runs from 1798, one dot each, stacked where they fall. At this sample size a dotplot shows every measurement and still gives the shape.
- **Chart title:** Cavendish weighs the world, 29 times
- **Chart subtitle:** One dot per run of the torsion balance; the modern value is 5.517
- **Notes:** Over-compression: semicolon-packed history History-first: date/person lead steals the slot that should sell the geom.

### `errorbar/mean-se`

- **Severity:** medium · **Visual:** ok — Functional; muddy gray clouds
- **Flags:** insider
- **Page title:** The data the t-test was invented on
- **Page description:** Extra hours of sleep in eleven patients under each of four treatments, with mean and standard error. Student's worked example from 1908.
- **Chart title:** The data the t-test was invented on
- **Chart subtitle:** Cushny and Peebles, 1905: extra hours of sleep in eleven patients (mean ± se)
- **Notes:** Insider: assumes named people/objects are already known.

### `errorbar/summary-bin`

- **Severity:** high · **Visual:** attractive — Classic regression sell
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Galton's regression to the middle
- **Page description:** Mean child height with a standard error in each class of mid-parent height. The means rise with the parents but not as fast, which is the observation that named regression.
- **Chart title:** Galton's children regress towards the middle
- **Chart subtitle:** Mean child height ± one standard error in each one-inch class of mid-parent height
- **Notes:** Over-compression: clever moral / unearned punchline History-first: date/person lead steals the slot that should sell the geom.

### `facet/ordered-side-strips`

- **Severity:** medium · **Visual:** attractive — Four clear distributions
- **Flags:** insider
- **Page title:** Counting yeast under a microscope
- **Page description:** Gosset's 1907 haemacytometer counts, 400 squares per sample, in ordered small multiples with the strip labels down the side.
- **Chart title:** Counting yeast under a microscope
- **Chart subtitle:** Gosset, 1907: cells per haemacytometer square, 400 squares per sample
- **Notes:** Insider: assumes named people/objects are already known.

### `facet/wrap`

- **Severity:** high · **Visual:** ok — Competent 2x2, low sparkle
- **Flags:** formula, history-first, over-subtitle, chart-labs
- **Page title:** 4,892 English children, measured by Pearson and Lee
- **Page description:** The 1903 family-height study split into one panel per parent's height, so the shift from panel to panel is the inheritance.
- **Chart title:** 4,892 English children, measured by Pearson and Lee
- **Chart subtitle:** Sons stand four and a half inches taller; the two daughter panels are the same girls, tabulated against each parent
- **Notes:** Formula: comma-formula: "4,892 English children, measured by Pearson and Lee" Over-compression: semicolon-packed history
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `facet/wrap-free-y`

- **Severity:** high · **Visual:** attractive — Different series earn free-y
- **Flags:** history-first, over-subtitle, insider, chart-labs
- **Page title:** London's bills of mortality, 1629 to 1710
- **Page description:** Arbuthnot's christenings and burials with each panel on its own y scale, so a series that spans a different range still shows its shape.
- **Chart title:** London's bills of mortality, 1629–1710
- **Chart subtitle:** The ratio never once falls below 1 — Arbuthnot's argument, on its own scale
- **Notes:** Over-compression: clever moral / unearned punchline; em-dash insider stack Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `freqpoly/basic`

- **Severity:** medium · **Visual:** ok — Clean but default monochrome
- **Flags:** history-first
- **Page title:** Michelson's speed of light as a frequency polygon
- **Page description:** The same hundred runs as the histogram, joined through the bin centres instead of drawn as bars.
- **Chart title:** Michelson measures the speed of light, 1879
- **Chart subtitle:** Frequency polygon through bin centers — same data as the histogram
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `hex/basic`

- **Severity:** low · **Visual:** attractive — Hex lattice + viridis hotspot
- **Flags:** clean-ish
- **Page title:** Fiji earthquakes in hexagons
- **Page description:** A thousand seismic events binned by where they struck: the counts pick out the plate junction and the Tonga trench running south towards New Zealand.
- **Chart title:** A thousand earthquakes off Fiji
- **Chart subtitle:** Every event above magnitude 4 since 1964, counted into hexagons
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `histogram/basic`

- **Severity:** high · **Visual:** attractive — Solid fill, red threshold pops
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Michelson measures the speed of light, 1879
- **Page description:** A hundred runs in km/s less 299,000. The modern value sits well off the centre of the distribution, which is the interesting part.
- **Chart title:** Michelson measures the speed of light, 1879
- **Chart subtitle:** 100 runs, km/s less 299,000 — the true value sits off the centre
- **Notes:** Over-compression: clever moral / unearned punchline History-first: date/person lead steals the slot that should sell the geom.

### `hline/threshold`

- **Severity:** high · **Visual:** ok — Dry black zigzag, faint hline
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Cavendish's readings against the modern value
- **Page description:** Twenty-nine torsion-balance determinations of the earth's density with a horizontal rule at the modern value of 5.517.
- **Chart title:** Cavendish weighs the world, 1798
- **Chart subtitle:** geom_hline marks the modern earth density (5.517)
- **Notes:** Over-compression: API leak in user copy History-first: date/person lead steals the slot that should sell the geom.

### `interaction/brush-zoom`

- **Severity:** medium · **Visual:** attractive — Species clouds separate cleanly
- **Flags:** over-subtitle, chart-labs
- **Page title:** Interval selection and zoom
- **Page description:** 333 Palmer penguins: brush a rectangle to select, or zoom into the crowded middle where the species overlap.
- **Chart title:** Select an interval or brush to zoom
- **Chart subtitle:** 333 Palmer penguins; brush a rectangle to select, or zoom into the crowded middle
- **Notes:** Over-compression: semicolon-packed history

### `interaction/facet-intervals`

- **Severity:** high · **Visual:** weak — All-black, half-finished look
- **Flags:** formula, chart-labs
- **Page title:** One interval, applied in every panel
- **Page description:** 333 Palmer penguins split by island, with a coordinate interval selection that holds across all the facets at once.
- **Chart title:** Palmer penguins by island
- **Chart subtitle:** ${preset} interval semantics
- **Notes:** Formula: comma-formula: "One interval, applied in every panel"

### `interaction/legend-filter`

- **Severity:** medium · **Visual:** attractive — Multi-series story + legend chrome
- **Flags:** history-first
- **Page title:** Playfair's fiscal three, 1770 to 1824
- **Page description:** Debt, revenue and expenditure. Filter any series from the legend and the ones that come back keep the colour they had.
- **Chart title:** Playfair's fiscal three, 1770–1824
- **Chart subtitle:** Filter any series; restored groups keep their original color
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `interaction/legend-focus`

- **Severity:** low · **Visual:** weak — Same plot thrice; demo layout not desire
- **Flags:** clean-ish
- **Page title:** Focus a legend group without changing the data
- **Page description:** Three of Playfair's commodity series. Focusing a group dims the others rather than dropping them, so the scales never move under you.
- **Chart title:** SVG points
- **Chart subtitle:** (none)
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `interaction/linked-views`

- **Severity:** high · **Visual:** weak — Sparse subsample, dual toolbars
- **Flags:** formula, chart-labs
- **Page title:** Link plots, controls, and a table
- **Page description:** Five Palmer penguins per species, so every row a selection touches is visible in the table beside the chart.
- **Chart title:** Select in either view
- **Chart subtitle:** Five Palmer penguins per species, so every linked row fits in the table
- **Notes:** Formula: comma-formula: "Link plots, controls, and a table"

### `interaction/tooltip`

- **Severity:** high · **Visual:** attractive — Dense well-separated clouds
- **Flags:** formula, over-subtitle, chart-labs
- **Page title:** Inspect and pin data
- **Page description:** Palmer penguin measurements with a crosshair that reads every series at one x, and a pin so the reading stays while you look elsewhere.
- **Chart title:** Inspect a shared x value, then pin
- **Chart subtitle:** 333 Palmer Archipelago penguins; flipper length is measured to the millimetre, so many birds share one
- **Notes:** Formula: comma-formula: "Inspect a shared x value, then pin" Over-compression: semicolon-packed history
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `jitter/basic`

- **Severity:** high · **Visual:** weak — Three gray blobs, dead space
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Wages across 70 trades, 1910
- **Page description:** Pearson's study of drink and wages. The trades share a handful of wage classes, so jitter is what separates them into readable marks.
- **Chart title:** Wages across 70 trades, 1910
- **Chart subtitle:** geom_jitter separates trades that share a wage class
- **Notes:** Over-compression: API leak in user copy History-first: date/person lead steals the slot that should sell the geom.

### `label/basic`

- **Severity:** high · **Visual:** attractive — Labeled historical points feel special
- **Flags:** formula, insider, chart-labs
- **Page title:** Every name on the first statistical graph, boxed
- **Page description:** Van Langren's 1644 estimates of the Toledo to Rome longitude, each labelled with the astronomer who made it, on a background box that survives the rule beneath.
- **Chart title:** Every name on the first statistical graph, boxed
- **Chart subtitle:** Van Langren, 1644: a background box keeps each name readable over the rule beneath
- **Notes:** Formula: comma-formula: "Every name on the first statistical graph, boxed" Insider: assumes named people/objects are already known.

### `line/ecdf`

- **Severity:** medium · **Visual:** ok — Honest stairs, austere
- **Flags:** history-first
- **Page title:** Richardson's deadly quarrels
- **Page description:** The empirical distribution of 779 conflicts by magnitude, the log10 of the death toll. The median quarrel killed about ten thousand people.
- **Chart title:** How deadly was the average quarrel?
- **Chart subtitle:** 779 pairs of belligerents, 1807 to 1949, by Richardson's log10 death toll
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `line/function`

- **Severity:** medium · **Visual:** attractive — Tight curve-to-points fit
- **Flags:** history-first, insider, chart-labs
- **Page title:** Quetelet's soldiers and the error curve
- **Page description:** The chest measurements Quetelet used to claim human variation follows the astronomers' error curve, with that curve drawn over them.
- **Chart title:** Quetelet's soldiers and the error curve
- **Chart subtitle:** 5,738 Scottish chests against a normal with the same mean and spread
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `line/multi-series`

- **Severity:** medium · **Visual:** attractive — Red vs teal contrast pops
- **Flags:** history-first
- **Page title:** Playfair's wheat and wages, 1565 to 1821
- **Page description:** Two series in shillings on one panel: the price of a quarter of wheat swings, and the weekly wage of a good mechanic only climbs.
- **Chart title:** Playfair's wheat and wages, 1565–1821
- **Chart subtitle:** Shillings — the price swings, the wage only climbs
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `line/time-axis`

- **Severity:** medium · **Visual:** ok — Single black stroke forgettable
- **Flags:** history-first
- **Page title:** British and Irish exports, 1855 to 1899
- **Page description:** Bowley's export series with the years left as raw four-digit strings, so the calendar meaning is inferred rather than declared.
- **Chart title:** British and Irish exports, 1855–1899
- **Chart subtitle:** Raw four-digit strings infer a calendar scale
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `map/choropleth`

- **Severity:** medium · **Visual:** attractive — Hot yellow core drama
- **Flags:** history-first, insider, chart-labs
- **Page title:** Snow's outbreak by nearest pump
- **Page description:** The same thirteen Soho neighbourhoods, shaded by the cholera deaths inside each. One region holds 359 of the 578, and it is the one around Broad Street.
- **Chart title:** 359 of 578 deaths were nearest the Broad Street pump
- **Chart subtitle:** The 1854 Soho outbreak counted into the area closest to each public pump
- **Notes:** Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.

### `path/connect-hv`

- **Severity:** medium · **Visual:** ok — Crisp steps, sparse 9 points
- **Flags:** history-first
- **Page title:** Minard's retreat thermometer
- **Page description:** Nine temperature readings taken along the road back from Moscow, joined by horizontal-then-vertical elbows so each reading holds until the next one was taken.
- **Chart title:** The cold Minard drew under the retreat
- **Chart subtitle:** Nine readings between Moscow and Wilna, each carried west until the next
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `path/ellipse-rings`

- **Severity:** high · **Visual:** attractive — Ellipses sell instantly
- **Flags:** formula, chart-labs
- **Page title:** Three penguins, three ellipses
- **Page description:** A 95% bivariate normal ring around each species in bill and flipper length. The rings overlap where the birds do, and a few fall outside their own.
- **Chart title:** Three penguins, three ellipses
- **Chart subtitle:** 95% bivariate normal rings around each species at Palmer Station
- **Notes:** Formula: comma-formula: "Three penguins, three ellipses"

### `path/trajectory`

- **Severity:** high · **Visual:** attractive — Dramatic dual-path decline
- **Flags:** formula, chart-labs
- **Page title:** Napoleon's march, drawn in march order
- **Page description:** Minard's strength counts against longitude. The retreat covers the same ground as the advance, so only a path drawn in row order tells the two legs apart.
- **Chart title:** Napoleon's army marches east and dies coming back
- **Chart subtitle:** Minard's 1812 strength counts, drawn in march order: out to Moscow, then home
- **Notes:** Formula: comma-formula: "Napoleon's march, drawn in march order"

### `point/abline-identity`

- **Severity:** medium · **Visual:** ok — Thin ~11 dots, empty plot
- **Flags:** insider
- **Page title:** Two sleeping drugs against y = x
- **Page description:** Extra hours of sleep under each of two hypnotics, patient by patient. The identity line is the claim being tested, and almost every patient sits above it.
- **Chart title:** One drug beat the other for ten of eleven patients
- **Chart subtitle:** Cushny and Peebles, 1905: points above the line slept longer on hyoscine
- **Notes:** Insider: assumes named people/objects are already known.

### `point/canvas-scatter`

- **Severity:** medium · **Visual:** attractive — Dense dual clouds modern
- **Flags:** over-subtitle, chart-labs
- **Page title:** Two and a half thousand points on canvas
- **Page description:** Above the automatic threshold ggsvelte renders marks to canvas instead of SVG, which is what keeps a scatter this size interactive.
- **Chart title:** Above the automatic threshold the marks go to canvas instead of SVG; the cloud is seeded, because the subject here is the render path
- **Chart subtitle:** Above the automatic threshold the marks go to canvas instead of SVG; the cloud is seeded, because the subject here is the render path
- **Notes:** Over-compression: semicolon-packed history; breathless multi-clause

### `point/count`

- **Severity:** high · **Visual:** attractive — Size encoding builds center mass
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** 928 heights, 102 places to put them
- **Page description:** Galton recorded parents and children to the nearest inch, so most of his table hides under a few hundred dots. Sizing each mark by its count puts it back.
- **Chart title:** 928 heights, 102 places to put them
- **Chart subtitle:** Galton rounded to the inch; each mark is sized by how many families landed on it
- **Notes:** Over-compression: semicolon-packed history History-first: date/person lead steals the slot that should sell the geom.

### `point/fixed-aspect`

- **Severity:** medium · **Visual:** weak — Twelve lonely dots on big grid
- **Flags:** over-subtitle, chart-labs
- **Page title:** Equal units stay circular
- **Page description:** A unit circle drawn under coord_fixed, which pins one pixel to one data unit on both axes so a circle cannot arrive as an ellipse.
- **Chart title:** Equal units stay circular
- **Chart subtitle:** coord_fixed preserves one CSS pixel per x and y data unit
- **Notes:** Over-compression: API leak in user copy

### `point/gradient-continuous`

- **Severity:** high · **Visual:** attractive — Month lattice + ramp distinctive
- **Flags:** formula, over-subtitle, chart-labs
- **Page title:** One register, forty-three years deep
- **Page description:** Monthly counts from the Paris register of 1812 to 1854, folded onto a single year. A two-stop colour ramp is what pulls the decades back apart.
- **Chart title:** Forty-three years of one register, stacked by month
- **Chart subtitle:** Paris, 1812 to 1854; the ramp is the only thing separating the years
- **Notes:** Formula: comma-formula: "One register, forty-three years deep"; comma-formula: "Forty-three years of one register, stacked by month" Over-compression: semicolon-packed history
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `point/hue-discrete`

- **Severity:** medium · **Visual:** weak — Ten isolated dots; legend denser than data
- **Flags:** over-subtitle, chart-labs
- **Page title:** How the Armada was loaded
- **Page description:** Ten squadrons of 1588 by ships and men aboard. Ten unordered categories are exactly what an even walk around the colour wheel is for.
- **Chart title:** How the Armada was loaded
- **Chart subtitle:** Ten squadrons, ships against men aboard; the galleys carried theirs in four hulls
- **Notes:** Over-compression: semicolon-packed history

### `point/jitter`

- **Severity:** high · **Visual:** weak — Same gray three-column sparsity
- **Flags:** formula, over-subtitle, chart-labs
- **Page title:** The same wages, jittered by position
- **Page description:** Pearson's drink and wages study again, with the jitter applied through the position rather than the geom sugar.
- **Chart title:** The same wages, jittered by position
- **Chart subtitle:** Pearson's 70 trades again, spread by position_jitter rather than the geom sugar
- **Notes:** Formula: comma-formula: "The same wages, jittered by position" Over-compression: API leak in user copy
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `point/layer-data-bands`

- **Severity:** low · **Visual:** attractive — War bands + rising line story
- **Flags:** clean-ish
- **Page title:** What the wars did to the national debt
- **Page description:** Playfair's debt series with two war periods behind it and one note on top, each layer carrying its own table because only one of the three is a measurement.
- **Chart title:** What the wars did to the national debt
- **Chart subtitle:** Playfair's series, 1770 to 1824, with the war years drawn behind it
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `point/log-scale`

- **Severity:** medium · **Visual:** attractive — Three color clusters separate well
- **Flags:** history-first
- **Page title:** Cholera, crowding and water in London, 1849
- **Page description:** Farr's 38 districts: death rate against population density on a log x scale, coloured by which company supplied the water.
- **Chart title:** Cholera, crowding and water in London, 1849
- **Chart subtitle:** Death rate against population density, by water company
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `point/quantile-lines`

- **Severity:** high · **Visual:** weak — Gray mush; quantile lines fuse
- **Flags:** formula, chart-labs
- **Page title:** Earthquake strength by depth
- **Page description:** A thousand events off Fiji with the quartiles of magnitude fitted through them. Quantile lines describe the spread, not just where the middle sits.
- **Chart title:** How strong an earthquake gets, by how deep it is
- **Chart subtitle:** Lower quartile, median and upper quartile of magnitude through the crust off Fiji
- **Notes:** Formula: comma-formula: "How strong an earthquake gets, by how deep it is"

### `point/scatter-color`

- **Severity:** high · **Visual:** attractive — Five region colors fill frame
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Literacy and crime in France, 1833
- **Page description:** Guerry's 86 departments, coloured by region. His uncomfortable finding was that more literate departments did not have less crime.
- **Chart title:** Literacy and crime in France, 1833
- **Chart subtitle:** Guerry found no tidy relationship — higher means fewer crimes per head
- **Notes:** Over-compression: em-dash insider stack History-first: date/person lead steals the slot that should sell the geom.

### `point/stat-manual-mean`

- **Severity:** high · **Visual:** attractive — Soft clouds + bold means
- **Flags:** formula, history-first, over-subtitle, chart-labs
- **Page title:** Michelson's five runs and their means
- **Page description:** A hundred speed-of-light measurements in the five blocks he ran them in, with each block collapsed to a single point by its mean.
- **Chart title:** Michelson's five runs, and where each settled
- **Chart subtitle:** Twenty measurements per run in faint marks; the solid mark is that run's mean
- **Notes:** Formula: comma-formula: "Michelson's five runs, and where each settled" Over-compression: semicolon-packed history
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `point/stat-unique`

- **Severity:** medium · **Visual:** weak — Monochrome overplot streaks
- **Flags:** history-first
- **Page title:** 779 rows of war, 321 marks
- **Page description:** Richardson recorded one row per pair of belligerents, so a large war repeats itself - 28 of the Second World War's pairs read the same year and death toll. Keeping the first row per position draws each once.
- **Chart title:** 779 rows of war, 321 marks
- **Chart subtitle:** Richardson counted belligerent pairs, so a war repeats: 28 of them read (1941, 7.3)
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `point/steps-binned`

- **Severity:** medium · **Visual:** weak — Cloud crushed left; dead white right
- **Flags:** over-subtitle, chart-labs
- **Page title:** Cholera against height above the Thames
- **Page description:** Farr's 38 London districts of 1849, coloured in bands by their poor rate. A stepped ramp reads as brackets, which is how a rate like this gets argued about.
- **Chart title:** Cholera fell away with height above the Thames
- **Chart subtitle:** 38 London districts in 1849, shaded in bands by their poor rate
- **Notes:** Over-compression: clever moral / unearned punchline

### `point/style-scales`

- **Severity:** high · **Visual:** weak — Five style channels fight; busy noise
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Minard's march on five style channels
- **Page description:** Line width, mark size and fade all carry the army's strength, the way Minard drew it; line type and shape carry the direction of march.
- **Chart title:** Minard's march on five style channels
- **Chart subtitle:** Width, size and fade all carry strength; line type and shape carry direction
- **Notes:** Over-compression: semicolon-packed history; breathless multi-clause History-first: date/person lead steals the slot that should sell the geom.

### `point/void-chrome`

- **Severity:** high · **Visual:** attractive — Pure sparkline lands
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** British exports as a sparkline
- **Page description:** Bowley's export series with theme_void: no axes, ticks, grid or panel border, just the shape of the run.
- **Chart title:** British exports, 1855 to 1899, as a sparkline
- **Chart subtitle:** theme_void keeps the marks and drops every axis, tick and grid line
- **Notes:** Over-compression: API leak in user copy History-first: date/person lead steals the slot that should sell the geom.

### `polygon/regions`

- **Severity:** low · **Visual:** attractive — Pastel Voronoi + pumps
- **Flags:** clean-ish
- **Page title:** Which pump was nearest
- **Page description:** The thirteen areas of Soho closest to each public pump in 1854, each drawn as one closed ring of vertices in winding order.
- **Chart title:** Which pump was nearest
- **Chart subtitle:** Soho split into the thirteen areas closest to each public pump, 1854
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `qq/normal`

- **Severity:** medium · **Visual:** ok — Textbook clean, monochrome
- **Flags:** history-first
- **Page title:** Michelson's errors against the normal
- **Page description:** A hundred speed-of-light runs plotted against the normal quantiles they would sit on if only chance moved them, with the quartile line for reference.
- **Chart title:** Were Michelson's errors normal?
- **Chart subtitle:** His 100 runs against the normal they would follow if only chance moved them
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `raster/grid`

- **Severity:** critical · **Visual:** attractive — Viridis diagonal core pops
- **Flags:** formula, over-subtitle, insider, chart-labs
- **Page title:** Three thousand criminals, measured
- **Page description:** Macdonell's 1902 table of stature against left middle finger length as a complete regular grid, which is what geom_raster needs to work.
- **Chart title:** Three thousand criminals, measured
- **Chart subtitle:** Macdonell, 1902: stature against left middle-finger length, 495 cells of a complete grid
- **Notes:** Formula: comma-formula: "Three thousand criminals, measured" Over-compression: API leak in user copy Insider: assumes named people/objects are already known.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `rect/regions`

- **Severity:** medium · **Visual:** weak — Washed blue slab, low contrast
- **Flags:** over-subtitle, chart-labs
- **Page title:** The price of wheat under twelve reigns
- **Page description:** Playfair's wheat series with each monarch's reign drawn as a shaded band behind it, the way Playfair drew them himself.
- **Chart title:** The price of wheat under twelve reigns
- **Chart subtitle:** Playfair, 1821 — he drew the reigns on the chart because his argument was political
- **Notes:** Over-compression: em-dash insider stack

### `ribbon/bounds`

- **Severity:** high · **Visual:** attractive — Sharp drop then tight band
- **Flags:** history-first, over-subtitle, insider, chart-labs
- **Page title:** Halley's Breslau burials, 1687 to 1691
- **Page description:** Five years of burial records by age, with the band showing the observed year-to-year range at each age around the mean.
- **Chart title:** Halley's Breslau burials, 1687–1691
- **Chart subtitle:** Five years of records; the band is the observed year-to-year range at each age
- **Notes:** Over-compression: semicolon-packed history Insider: assumes named people/objects are already known. History-first: date/person lead steals the slot that should sell the geom.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `ribbon/paint`

- **Severity:** high · **Visual:** ok — Toy synthetic ribbon
- **Flags:** formula, chart-labs
- **Page title:** A ribbon with gradient fill, stroke and glow
- **Page description:** The paint options a ribbon can carry, on a precomputed interval: a portable gradient across the band, a stroked edge and a glow beneath.
- **Chart title:** What a ribbon can be painted with
- **Chart subtitle:** One interval band carrying a gradient fill, a gradient stroke and a glow
- **Chart caption:** Within-mark paint (not a data scale); solid fallbacks remain for a11y.
- **Notes:** Formula: comma-formula: "A ribbon with gradient fill, stroke and glow"

### `rule/annotation`

- **Severity:** medium · **Visual:** attractive — Red cut + gray modern line
- **Flags:** history-first
- **Page title:** Two rules on Cavendish's determinations
- **Page description:** The twenty-nine readings with reference rules marking the modern value and the run at which he refitted the balance.
- **Chart title:** Cavendish weighs the world, 1798
- **Chart subtitle:** Vertical rule: he refits the balance with a stiffer wire. Horizontal: the modern value.
- **Notes:** History-first: date/person lead steals the slot that should sell the geom.

### `rule/data-driven`

- **Severity:** critical · **Visual:** ugly — Gray sticks only; looks broken
- **Flags:** formula, over-subtitle, insider, chart-labs
- **Page title:** The first statistical graph was a rug
- **Page description:** Van Langren's 1644 longitude estimates, one rule per determination, which is the form his own chart took.
- **Chart title:** The first statistical graph was a rug
- **Chart subtitle:** Van Langren, 1628–1644: 61 estimates of a single fixed distance, spread across thirteen degrees
- **Notes:** Formula: firstism: "The first statistical graph was a rug" Over-compression: clever moral / unearned punchline Insider: assumes named people/objects are already known.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `segment/annotations`

- **Severity:** high · **Visual:** attractive — Win/loss segments instant
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Darwin's maize, 1876
- **Page description:** Fifteen pairs grown side by side, each drawn as a segment from the self-fertilised height to the cross-fertilised one, so the direction is the result.
- **Chart title:** Darwin's maize, 1876
- **Chart subtitle:** Fifteen pairs grown side by side; the segment runs self → cross
- **Notes:** Over-compression: semicolon-packed history History-first: date/person lead steals the slot that should sell the geom.

### `sf/basic`

- **Severity:** low · **Visual:** attractive — Nested elevation rings
- **Flags:** clean-ish
- **Page title:** Maunga Whau as simple features
- **Page description:** Three closed height rings of an Auckland volcano, each carried as one GeoJSON polygon in a geometry column rather than a table of vertices.
- **Chart title:** Maunga Whau as three simple features
- **Chart subtitle:** The ground above 130, 140 and 150 metres, one GeoJSON polygon per row
- **Notes:** Relative keep: leads with capability or plain finding more than pastiche.

### `sf/boxed-labels`

- **Severity:** high · **Visual:** ok — Boxes help; small cells cramped
- **Flags:** formula, over-subtitle, chart-labs
- **Page title:** The same names, on paper
- **Page description:** The Soho pump map again, with each name backed by a measured box. Set beside the plain-text version it shows what the box buys over a busy fill.
- **Chart title:** The same names, on paper
- **Chart subtitle:** geom_sf_label backs each pump's name with a measured box
- **Notes:** Formula: comma-formula: "The same names, on paper" Over-compression: API leak in user copy
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `sf/geometry-collection`

- **Severity:** high · **Visual:** weak — One C-blob + empty half
- **Flags:** formula, chart-labs
- **Page title:** One feature, two pieces of ground
- **Page description:** Everything above 180 metres on Maunga Whau: the summit ridge and a separate rise, carried in one GeometryCollection and expanded into two closed parts.
- **Chart title:** One feature, two pieces of ground
- **Chart subtitle:** Everything on Maunga Whau above 180 m: the summit ridge and a rise east of it
- **Notes:** Formula: comma-formula: "One feature, two pieces of ground"

### `sf/holes`

- **Severity:** medium · **Visual:** attractive — Nested donuts clear
- **Flags:** over-subtitle, chart-labs
- **Page title:** Height bands with holes punched out
- **Page description:** Two slopes of Maunga Whau, each the area inside one contour and outside the next. The interior ring and the even-odd rule are what leave the middle open.
- **Chart title:** Two bands of the same hillside
- **Chart subtitle:** Each band is one ring with the next punched out; each hole is the ground above the higher contour
- **Notes:** Over-compression: semicolon-packed history

### `sf/labels`

- **Severity:** high · **Visual:** ok — Labels crushed in small polys
- **Flags:** formula, history-first, chart-labs
- **Page title:** Snow's pumps, named in place
- **Page description:** The thirteen Soho neighbourhoods with each pump's street name set at the centre of the area it served, positioned from the geometry rather than from x and y.
- **Chart title:** Every pump in Snow's Soho, named
- **Chart subtitle:** Plain labels at the centre of the area each pump served
- **Notes:** Formula: comma-formula: "Snow's pumps, named in place"; comma-formula: "Every pump in Snow's Soho, named"

### `smooth/loess-scatter`

- **Severity:** critical · **Visual:** ugly — ~12 points drowning in fat gray CI band; empty plot
- **Flags:** formula, over-subtitle, insider, chart-labs
- **Page title:** The first scatterplot, redrawn
- **Page description:** Herschel plotted gamma Virginis in 1833 and fitted the curve through it by hand. A loess smooth with a confidence band does the same job.
- **Chart title:** The first scatterplot, redrawn
- **Chart subtitle:** Herschel plotted γ Virginis in 1833 and fitted the curve by hand
- **Notes:** Formula: firstism: "The first scatterplot, redrawn" Over-compression: clever moral / unearned punchline Insider: assumes named people/objects are already known.
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `spoke/vector-field`

- **Severity:** medium · **Visual:** weak — Monochrome tick forest; hard to parse
- **Flags:** over-subtitle, chart-labs
- **Page title:** Which way the water runs off Maunga Whau
- **Page description:** The downhill direction and steepness of an Auckland volcano at 140 points: a direction and a size at every place, which is what geom_spoke draws.
- **Chart title:** Which way the water runs off Maunga Whau
- **Chart subtitle:** Downhill direction at 140 points, arrow length by how steep the ground is
- **Notes:** Over-compression: API leak in user copy

### `step/ecdf`

- **Severity:** high · **Visual:** ok — Clean stairs, no hook
- **Flags:** formula, history-first, over-subtitle, chart-labs
- **Page title:** Darwin's maize, pair by pair
- **Page description:** Fifteen paired height differences from Darwin's 1876 fertilisation trial, drawn as stairs from precomputed coordinates. Where the line crosses zero is his result.
- **Chart title:** Darwin's fifteen pairs of maize
- **Chart subtitle:** How much taller the cross-fertilised plant grew; two pairs went the other way
- **Notes:** Formula: comma-formula: "Darwin's maize, pair by pair" Over-compression: semicolon-packed history
- **Lulu vector fail:** reader cannot form the belief "I want this chart in my app" from this title/subtitle; the prose optimizes for sounding learned, not for the action of adopting the geom.

### `text/labels`

- **Severity:** medium · **Visual:** ok — Names-as-data; right stack crowds
- **Flags:** over-subtitle, insider, chart-labs
- **Page title:** Every name on the first statistical graph
- **Page description:** Van Langren, 1644: the labels are the data, because he named the astronomer behind every estimate including the ones that were wrong.
- **Chart title:** Every name on the first statistical graph
- **Chart subtitle:** Van Langren, 1644 — the labels are the data: he named who got it wrong
- **Notes:** Over-compression: em-dash insider stack Insider: assumes named people/objects are already known.

### `tile/heatmap`

- **Severity:** high · **Visual:** attractive — Dark calendar + hot September
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Cholera in England and Wales, 1849
- **Page description:** Every day of the epidemic from Farr's weekly returns, laid out as a calendar of tiles so the summer peak reads as a block.
- **Chart title:** Cholera in England and Wales, 1849
- **Chart subtitle:** Registered deaths every day of the year; 53,293 in all, peaking at 1,121 on 6 September
- **Notes:** Over-compression: semicolon-packed history History-first: date/person lead steals the slot that should sell the geom.

### `vline/cutoff`

- **Severity:** high · **Visual:** attractive — Red cut alone is enough
- **Flags:** history-first, over-subtitle, chart-labs
- **Page title:** Where Cavendish refitted the balance
- **Page description:** The twenty-nine determinations in the order he reported them, with a vertical rule at the run where he fitted a stiffer wire.
- **Chart title:** Cavendish weighs the world, 1798
- **Chart subtitle:** geom_vline: he refits the balance with a stiffer wire after trial 6
- **Notes:** Over-compression: API leak in user copy History-first: date/person lead steals the slot that should sell the geom.

---

## Pattern catalog (systemic, not one-offs)

### 1. The comma formula (`X, Y`)

Examples of the exact construction the user hates:

- `contour/basic`: _Maunga Whau, height by height_
- `curve/connectors`: _Darwin's maize, curved_
- `density/kde-2d`: _Snow's cholera deaths close on one pump_
- `facet/wrap`: _4,892 English children, measured by Pearson and Lee_
- `interaction/facet-intervals`: _Palmer penguins by island_
- `interaction/linked-views`: _Select in either view_
- `interaction/tooltip`: _Inspect a shared x value, then pin_
- `label/basic`: _Every name on the first statistical graph, boxed_
- `path/ellipse-rings`: _Three penguins, three ellipses_
- `path/trajectory`: _Napoleon's army marches east and dies coming back_
- `point/gradient-continuous`: _Forty-three years of one register, stacked by month_
- `point/jitter`: _The same wages, jittered by position_
- `point/quantile-lines`: _How strong an earthquake gets, by how deep it is_
- `point/stat-manual-mean`: _Michelson's five runs, and where each settled_
- `raster/grid`: _Three thousand criminals, measured_
- `ribbon/paint`: _What a ribbon can be painted with_
- `rule/data-driven`: _The first statistical graph was a rug_
- `sf/boxed-labels`: _The same names, on paper_
- `sf/geometry-collection`: _One feature, two pieces of ground_
- `sf/labels`: _Every pump in Snow's Soho, named_
- `smooth/loess-scatter`: _The first scatterplot, redrawn_
- `step/ecdf`: _Darwin's fifteen pairs of maize_

### 2. API leak in human-facing subtitles

- `boxplot/violin`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `col/theme-linedraw`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `curve/connectors`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `hline/threshold`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `jitter/basic`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `point/fixed-aspect`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `point/jitter`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `point/void-chrome`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `raster/grid`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `sf/boxed-labels`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `spoke/vector-field`: chart subtitle or page desc names a geom/theme/position API as if that were the finding
- `vline/cutoff`: chart subtitle or page desc names a geom/theme/position API as if that were the finding

### 3. "First statistical graph" franchise (overplayed)

- `label/basic`: _Every name on the first statistical graph, boxed_
- `rule/data-driven`: _The first statistical graph was a rug_
- `smooth/loess-scatter`: _The first scatterplot, redrawn_
- `text/labels`: _Every name on the first statistical graph_

### 4. Same historical cast reused until it stops teaching

Michelson, Cavendish, Snow/Broad Street, Darwin maize, Playfair, Galton, Quetelet chests, Armada, Van Langren appear again and again. Reuse is fine for data; reusing the same **voice of unearned intimacy** with those names is what makes every page feel like the same AI draft.

---

## What would pass the desire test

Not prescriptions for every rewrite — only the bar this audit used:

1. **Title sells the chart capability or a plain finding**, not a trivia boast. ("LOESS with a confidence band" or "Eruption length predicts wait time" beat "The first scatterplot, redrawn".)
2. **Subtitle teaches any required context in plain English**, or drops the history. If Herschel stays, say who and what in words a stranger can use.
3. **No API identifiers in gallery titles** unless the page is explicitly a theme/API specimen (`theme_linedraw` is borderline: ok if the page _is_ the theme demo).
4. **Visual must make someone want the mark.** Sparse gray sticks and empty blank frames belong as secondary "how axes work" notes, not hero tiles.
5. **Chart Labs = page = code sample.** Fix once at the source (`Example.svelte` + `spec.ts` + regenerate manifest).

---

## Sources checked

- All 85 `examples/**/Example.svelte` Labs strings
- Matching `examples/**/spec.ts` (code-block parity)
- `examples/manifest.ts` page title + description
- All 85 light previews under `apps/docs/static/previews/`
- Spot-check VR baselines under `tests/visual/__screenshots__/` and `.local-baselines/`
- Live docs base confirmed from README: <https://ggsvelte.sh/examples>

STATUS: DONE — audit only, no copy rewrites in this pass.
