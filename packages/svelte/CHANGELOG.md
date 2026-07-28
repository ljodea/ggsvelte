# @ggsvelte/svelte

## 0.15.0

### Minor Changes

- d4c969b: <!-- markdownlint-disable MD041 -->

  feat(inspect): let a layer opt out of inspection

  An area mark reports distance 0 everywhere it is painted, so a full-panel
  background band outranks every point and stroke beneath it: the tooltip binds to
  the band and the reader can never reach the data. Set `inspect={false}` on that
  layer (or `"inspect": false` in the spec) and its marks never become tooltip,
  hover, or keyboard-traversal candidates.

  It travels with the spec, so a JSON round trip and a headless render agree with
  the browser. Rect hit maths is unchanged, so layers that want an area tooltip —
  bars, tiles, heatmaps — keep one.

  Migration: none — additive

- 6c44565: <!-- markdownlint-disable MD041 -->

  feat(spec): month-day scale surface — the `md` parser and `temporalKind: "monthDay"`

  Plotting observations from many years against the calendar day they fell on
  had no representation. Authors faked it by projecting every value onto an
  invented reference year and carrying that year in their data — which is how
  the Kyoto cherry-blossom lesson ended up shipping a `bloomRefDate` column
  whose only job was to be thrown away by the axis.

  `temporalKind: "monthDay"` says it directly: the year collapses inside the
  scale, so the same calendar day from any year shares one position.

  ```svelte
  <ScaleYMonthDay
    reverse
    domain={["05-10", "03-18"]}
    breaks={["04-05", "04-15"]}
  />
  ```

  Values, `domain`, and `breaks` all drop the year. They resolve through a new
  `md` parser, which takes `MM-DD`, the ISO recurring form `--MM-DD`, or a full
  date whose year it discards. It joins the partial-date family beside `ym`,
  `my`, and `yq`, and — like them — is never chosen by automatic inference.

  **Month and day survive; day-of-year does not.** Those differ for every leap
  year, which is exactly the bug the reference-year trick used to introduce.

  This ships the authoring surface: helpers, builder methods, generated
  components, schema, and validation. Rendering follows.

  Colour scales keep `date | datetime`. Month-day is a position idea and
  nothing asked for it there.

  Internally `TemporalScaleKind` is a new type, deliberately not a widening of
  `TemporalKind`. `TemporalKind` is also what parsing a value _returns_, and no
  value parses to `monthDay` — it is a projection applied afterwards. Splitting
  them keeps `decision.kind === conversion.requestedKind` comparisons honest at
  compile time.

  Migration: none — additive

### Patch Changes

- 97f3e2c: <!-- markdownlint-disable MD041 -->

  fix(theme): flat tooltip chrome for gridless themes

  Gridless themes (tufte, void) derive a transparent tooltip keyline and omit the
  default "Click to pin" affordance so minimal-ink charts keep flat interaction
  chrome (#1069). Pinning still works; only the instructional footer is silent.
  Themes that draw a grid keep the hairline border and pin hint. Inspect configs
  with `pin: false` also omit the affordance.

  Migration: none — additive visual for gridless themes only

- cd09bd8: <!-- markdownlint-disable MD041 -->

  feat(spec): export schema-derived `GEOM_REFERENCE` for every geom

  `GEOM_REFERENCE` / `geomReferenceList()` walk SpecDeclarations and publish
  each geom's summary, defaults, allowed stats and positions, and param docs.
  The docs site uses this for `/reference/geoms` so Svelte props stay in step
  with `schema/v0.json`. Also documents five previously undescribed params
  (`pointrange`/`crossbar` `funMin`/`funMax`, `function.args`).

  Migration: none — additive

- 6c44565: <!-- markdownlint-disable MD041 -->

  fix(data): correct the 2026 Kyoto bloom date and refresh the provenance

  The 2026 row said 30 March (day 89). Peak bloom was 29 March (day 88). We
  took the series from the George Mason mirror, which was committed four days
  before Genki Katata published the authoritative 2026 entry; Our World in
  Data carries 29 March too. Every other year checks out — all 827 shared
  years match Aono's own `KyotoFullFlower7.xls`, and 2016–2025 match Katata's
  continuation.

  The provenance also needed refreshing. Aono's site closed on 2025-03-31 and
  he has since died, so the notice now points at NOAA NCEI, which holds his
  file, and at Katata (CIGS), who continues the series after it ends in 2015.
  The header claimed direct observation "up to 1888"; upstream says the
  modern full-bloom record starts in the 1880s. It now also states that the
  dates are proleptic Gregorian throughout, so nobody goes looking for a
  calendar seam at 1582.

  The committed lesson chart SVGs move by one point.

- 8871d55: <!-- markdownlint-disable MD041 -->

  docs(quickstart): name the epochs above the bands, and fix the callouts

  The chart sent readers to a colour key at the foot of the plot to learn what
  three coloured bands meant, under the title "Climate epoch" — a phrase that
  editorialises where the data was doing fine on its own. The names now sit
  above the bands they name, and the legend is gone.

  They go in the strip between the panel top and the bands, which was already
  empty: the earliest bloom in 1,200 years is 25 March and the domain starts on
  18 March. No observation is displaced and the axis makes no new claim.

  The baseline rule was `#9aa0a6` at alpha 0.7 and effectively invisible, marking
  something nothing named. It is darker and full strength, and the caption says
  what it is. The reference chart puts that label in the right margin; mid-April
  is dense in every century, so there is nowhere inside the panel to say it
  without printing text over data.

  Callouts now state the record as well as the claim — "1323 · May 4, latest on
  record" rather than "1323 — latest on record" — with a middle dot, and every
  label sits left of the point it names with an end anchor, so no leader runs
  back through its own words. Verified by measuring rendered geometry at 640,
  900 and 1200px, not by eye.

  Migration: none — additive

- 40c3376: <!-- markdownlint-disable MD041 -->

  fix(data): drop `bloomRefDate` from the Kyoto teaching dataset

  The column projected each observation's day-of-year onto the year 2001 so a
  date axis could draw it. Two things were wrong with that. It shipped a
  fabricated year inside published data — no other copy of Aono's record has
  anything like it — and it preserved day-of-year rather than month-day, so
  **204 of 838 rows disagreed with `bloomDate` by a day**. Year 812 bloomed on
  1 April and the column said 2 April.

  `temporalKind: "monthDay"` removes the need for it. The year now collapses
  inside the scale, where it is a private implementation detail.

  This is a bundled teaching/demo dataset, not a product API contract. Anyone
  still mapping `y: "bloomRefDate"` should map `y: "bloomDate"` and give the
  axis a month-day scale:

  ```svelte
  <GGPlot data={kyotoSakura} aes={{ x: "year", y: "bloomDate" }}>
    <ScaleYMonthDay reverse domain={["05-10", "03-18"]} />
  </GGPlot>
  ```

  `bloomDate` (the real observation) and `bloomDoy` are unchanged. Anyone who
  needs the old projection can compute it, but the month-day scale is the
  correct answer and does not have the leap-year fault.

  The getting-started lesson migrates with it, so the spec it teaches now
  contains no year outside the `year` column itself.

  Guide: <https://ggsvelte.sh/guide/scales-guides#date-and-time-axes>

- cd3ee72: <!-- markdownlint-disable MD041 -->

  feat(spec): export schema-derived `POSITION_REFERENCE` for every position

  `POSITION_REFERENCE` / `positionReferenceList()` publish each position
  adjustment's summary, `positionParams` (from the PositionParams schema for
  jitter/nudge), and compatible geoms. The docs site uses this for
  `/reference/positions`.

  Migration: none — additive

- e969b35: <!-- markdownlint-disable MD041 -->

  feat(spec): export schema-derived `STAT_REFERENCE` for every stat

  `STAT_REFERENCE` / `statReferenceList()` publish each statistical transform's
  summary, after_stat columns (`STAT_COLUMNS`), and compatible geoms (inverted
  from `GEOM_REFERENCE`). The docs site uses this for `/reference/stats`.

  Migration: none — additive

- Updated dependencies [97f3e2c]
- Updated dependencies [06fc8e9]
- Updated dependencies [8541dc6]
- Updated dependencies [3e9d5fa]
- Updated dependencies [95f2c1d]
- Updated dependencies [cd09bd8]
- Updated dependencies [40c3376]
- Updated dependencies [d4c969b]
- Updated dependencies [b80a3b1]
- Updated dependencies [2e0811b]
- Updated dependencies [6c44565]
- Updated dependencies [cd3ee72]
- Updated dependencies [e39ea45]
- Updated dependencies [e969b35]
- Updated dependencies [cc0b0cd]
  - @ggsvelte/core@0.15.0
  - @ggsvelte/spec@0.15.0

## 0.14.1

### Patch Changes

- b9cde4e: <!-- markdownlint-disable MD041 -->

  fix(inspect): drop duplicate columns from default tooltips

  When fill or color remaps the same column as a position channel (common on
  categorical bars: `aes(x = cat, fill = cat)`), the default tooltip listed that
  column twice — once under the labs title and again under the raw field name.
  Default tooltips now keep the first row per column name, matching a11y
  live-text. Distinct color/fill columns still appear.

  Migration: none
  - @ggsvelte/spec@0.14.1
  - @ggsvelte/core@0.14.1

## 0.14.0

### Patch Changes

- 28ffaf0: <!-- markdownlint-disable MD041 -->

  Generate Geom* shells from the spec schema (`GEOM_PARAM_KEYS`) so param lists are no longer hand-copied. Schema param keys such as `fillPaint`, `strokePaint`, and `glow` now forward into layer params when set on the corresponding shells.

- 9c22922: <!-- markdownlint-disable MD041 -->

  Semantic viewport owns client→plot mapping via `locate`; surface deletes `plot-px`.

  `SemanticViewport.locate(clientX, clientY, rect)` maps capture-element client coordinates into scene pixels (CSS scale, zero-size guard, no OOB clamp). `createSemanticViewport` now takes a single options object including `sceneSize`. Interaction `setInspection` takes `CandidateFacts` only — `SceneHit` / `hitFromCandidate` / `plot-px` are gone (were never public exports).

  Migration: none — additive

- Updated dependencies [6ca5c5d]
- Updated dependencies [efeea7f]
- Updated dependencies [28ffaf0]
- Updated dependencies [9c22922]
  - @ggsvelte/spec@0.14.0
  - @ggsvelte/core@0.14.0

## 0.13.0

### Minor Changes

- 34183f1: <!-- markdownlint-disable MD041 -->

  Add `palmerPenguins` and `mpg` to `@ggsvelte/svelte/data` so the bundled
  teaching surface covers the three shapes the guide needs: time series
  (`kyotoSakura`), continuous distribution with groups (`palmerPenguins`, CC0),
  and categorical comparison (`mpg`, EPA / ggplot2 subset). Each ships with a
  citation export, a docs JSON asset pinned to the package rows, and NOTICE
  attribution.

  Migration: none — additive

- dfa1ba0: <!-- markdownlint-disable MD041 -->

  Remove the seven deprecated grammar props from `<GGPlot>` (`theme`, `scales`,
  `coord`, `facet`, `labs`, `guides`, `legend`) and the `LayerDescriptor` type
  alias. Compose grammar as declaration-only children; use
  `MarkLayerDescriptor`. Run `npx ggsvelte-codemod --write` on old source.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-12-to-0-13>

- cce4f5a: # One diagnostic prose source (#987)

  - Move `PIPELINE_ERROR_CATALOG` into `@ggsvelte/spec` (re-exported from core)
  - Dual-channel codes share `DUAL_ERROR_PROSE` so summary/fix cannot drift
  - Rename validation code `scale-manual-domain-range` → `color-manual-domain-range`
  - Docs error-reference imports pipeline error prose from `@ggsvelte/spec`

  Migration: <https://ggsvelte.sh/guide/upgrading#0-11-to-0-12>

### Patch Changes

- 10979c1: <!-- markdownlint-disable MD041 -->

  lifecycle: promote Geom* declaration-only shells to stable-intent (#705)

  Tag every public `<Geom*>` component stable-intent so the recommended Svelte
  composition path matches theme/scale/coord grammar children. Registry and
  factory helpers stay experimental. Tag-only change — no runtime API change.

  Migration: none — additive

- 5b54dcb: # Extract dataChecks layer walk; per-layer style/color evidence (#844)

  Move geom/stat type rules, field existence, and channel collection into
  `validate-data-checks-layer.ts` so `dataChecks` is a thin orchestrator
  (evidence → walk → style/position/color checkers).

  Style and color scale checks now take the same per-use `evidenceForUse`
  path as position (#609): multi-table layers that share a field name keep
  their own type view, so a later quantitative layer no longer last-wins-hides
  an earlier sequential/finite-style mismatch.

  Migration: none — validation is stricter only for multi-table same-name
  field cases that previously under-reported scale-type-mismatch.

- 45a4a31: <!-- markdownlint-disable MD041 -->

  refactor(svelte): extract pure data-identity epoch input builder

  Move markLayers-vs-layers-prop, ready-without-assembled, and explicit-spec
  content pick into buildDataIdentityEpochInput next to dataIdentityEpochToken.
  plot-engine keeps the tracker and $derived call site.

- a955cf2: <!-- markdownlint-disable MD041 -->

  refactor(svelte): thin scene-reconcile apply out of InspectionState $effect

  `applySceneInspectReconcile(plan, bag)` owns the clear-disabled / invalidate-*
  side-effect table; the factory `$effect` is a short plan → apply shell (#855).

- c550483: <!-- markdownlint-disable MD041 -->

  perf(svelte): CAP-sized heap for canvas a11y table row select

  Opening the canvas a11y table no longer fully sorts every distinct source-row
  index. Keep a max-heap of the CAP smallest indexes that materialise so cost is
  O(R log CAP) instead of O(R log R) when R ≫ 100.

- 2531cb5: <!-- markdownlint-disable MD041 -->

  docs(svelte): rewrite the shipped agent skill artifact for the 0.12 API

  The skill (`skills/ggsvelte/`, shipped in the package tarball) now teaches
  child-layer composition as the canonical Svelte form, draws the JSON-vs-props
  aes distinction, covers the 0.11.0 grammar-prop deprecation and codemod, and
  adds a `references/` tree with exhaustive geom/stat/theme/palette/scale
  inventories checked against the spec catalogs by `scripts/skill-content.test.ts`.

- Updated dependencies [f6d99d5]
- Updated dependencies [dfa1ba0]
- Updated dependencies [d800541]
- Updated dependencies [5b54dcb]
- Updated dependencies [d4934b0]
- Updated dependencies [3e463ae]
- Updated dependencies [20a3e17]
- Updated dependencies [58bccd6]
- Updated dependencies [ee099ba]
- Updated dependencies [3c5fba6]
- Updated dependencies [cce4f5a]
  - @ggsvelte/core@0.13.0
  - @ggsvelte/spec@0.13.0

## 0.12.0

### Minor Changes

- 3ec23b0: # Add geom_path — data-order polylines (#788)

  ggplot2 `geom_path` connects observations in row/data order within each group (no x-sort). `geom_line` continues to sort by x.

  - PortableSpec: `geom: "path"` (PathLayer, same params as line)
  - Builder: `.geomPath()`; Svelte: `<GeomPath />`
  - Core: reuses line path batch builder with `sortByX: false`

  Migration: none — additive

- c2e3856: <!-- markdownlint-disable MD041 -->

  feat(#789): first-class geom_step (hv / vh / mid)

  Add `geom: "step"` with `params.direction` matching ggplot2 geom_step:
  default `"hv"`, plus `"vh"` and `"mid"`. Surfaces: JSON/schema, builder
  `.geomStep()`, and `<GeomStep />`. Step corner emission is shared across SVG,
  canvas, and coord projection (`path-step.ts`). Existing `line` +
  `curve: "step"` mid-style remains.

  Migration: none — additive

- f2c0997: <!-- markdownlint-disable MD041 -->

  feat: geom_blank for scale training without marks (#791)

  Add ggplot2-style `blank` geom that trains scales from mapped aesthetics and
  emits no geometry batches or interaction candidates. Surfaces: PortableSpec,
  `geomBlank()`, and `<GeomBlank>`.

  Migration: none — additive

- e90a228: <!-- markdownlint-disable MD041 -->

  feat(geom): linerange, pointrange, and crossbar interval family (#793)

  ggplot2-compatible range geoms beyond errorbar: stem-only linerange, stem +
  mid point pointrange, and box + mid line crossbar (width/fatten). Builder and
  `<Geom*>` sugar included.

  Migration: none — additive

- 38af6a8: <!-- markdownlint-disable MD041 -->

  feat: geom_curve curved connectors (#794)

  Add ggplot2-style `curve` geom: curved connectors from (x,y) to (xend,yend)
  tessellated as a quadratic Bezier in panel px (aspect-safe curvature). Params:
  curvature (default 0.5), angle (degrees, default 90), ncp (density knob).
  One path subpath per row; one semantic candidate per curve.

  Intentional subset: quadratic Bezier approximation, not full grid xspline.
  Migration: none — additive

- cac7d43: <!-- markdownlint-disable MD041 -->

  feat(#795): geom_count + stat_sum overplotting counts

  Add `stat: "sum"` (after_stat `n` and `prop` within group) and `geom: "count"`
  sugar (point marks; size defaults to `{ stat: "n" }`). Also
  `.geomPoint({ stat: "sum" })` / `<GeomCount />`.

  Migration: none — additive

- a89cc93: <!-- markdownlint-disable MD041 -->

  feat: geom_freqpoly frequency polygon (#796)

  Add ggplot2-style `freqpoly` alias that normalize() rewrites to `line` +
  `stat: "bin"` + position identity. Bin centers are drawn as a path; y defaults
  to count (or density). LineParams gains optional STAT BIN ONLY knobs;
  PathParams stays style-only so path never accepts bin params.

  Surfaces: PortableSpec, `.geomFreqpoly()`, `<GeomFreqpoly>`.

  Migration: none — additive

- f0f379c: <!-- markdownlint-disable MD041 -->

  feat(#797): geom_function + stat_function named analytic curves

  Portable registry (`identity`, `dnorm`, `pnorm`, `linear`) evaluated on a
  grid — domain from `params.xlim`, own continuous `aes.x`, or peer-layer x.
  Surfaces: `.geomFunction()`, `<GeomFunction />`, example `line/function`.

  Migration: none — additive

- 40a43f9: # Add geom_bin_2d + stat_bin_2d heatmap (#799)

  2D rectangular binning with after_stat `fill=count` by default (ggplot2
  `geom_bin2d` / `stat_bin_2d`). Reuses edge-rect geometry and 1D break helpers.

  - PortableSpec: `geom: "bin_2d"` / `stat: "bin_2d"` with `params.bins`,
    `binwidth`, and `drop`
  - Builder: `.geomBin2d()`; Svelte: `<GeomBin2d />`
  - Color binding accepts after_stat columns (`count`, `density`, `ncount`,
    `ndensity`) for fill

  Migration: none — additive

- 158576b: # Add geom_hex / stat_bin_hex — hexagonal bin heatmap (#800)

  ggplot2-compatible 2D hexagonal binning heatmap:

  - Stat `bin_hex`: pointy-top axial lattice; fill defaults to after_stat count
  - Geometry: one closed path subpath per occupied hex
  - Surfaces: PortableSpec, `.geomHex()`, `<GeomHex />`
  - Params (v1): `bins` (default 30), `drop` (default true), `alpha`, `linewidth`

  Migration: none — additive

- a832c75: <!-- markdownlint-disable MD041 -->

  feat: geom_contour + stat_contour isolines (#801)

  Add `geom: "contour"` (default `stat: "contour"`) for open isoline polylines
  over a regular continuous x×y×z grid. Levels from `params.breaks`,
  `binwidth`, or `bins` (default 10, min..max inclusive). Clean-room marching
  squares (no R/C++). Builder `.geomContour()` and Svelte `<GeomContour />`.

  v1: open path polylines only; no contour_filled / irregular triangulation /
  default color-by-level. Incomplete grid cells are skipped; groups without a
  usable grid or levels are dropped with a warning.

  Migration: none — additive

- c11861d: <!-- markdownlint-disable MD041 -->

  # feat: geom_density_2d_filled closed KDE rings (#802 phase 2)

  Add `geom: "density_2d_filled"` / `stat: "density_2d_filled"` with builder
  `.geomDensity2dFilled()` and Svelte `<GeomDensity2dFilled />`. Same product
  Gaussian KDE as density_2d; closed isoline rings become filled paths. Open
  rings are dropped with a warning. Fill defaults to `after_stat(level)` via
  `ColorBinding.statColumn`.

  Migration: none — additive

- b90e651: <!-- markdownlint-disable MD041 -->

  feat: geom_density_2d + stat_density_2d KDE isolines (#802)

  Add `geom: "density_2d"` (default `stat: "density_2d"`) for bivariate product
  Gaussian KDE isolines. Bandwidth MASS bandwidth.nrd then kde2d h/4 (or
  `params.h`); grid `n`×`n` (default 100) over a 5%-expanded data range;
  levels via breaks / binwidth / bins. Clean-room MS via shared contour
  helpers. Builder `.geomDensity2d()` and Svelte `<GeomDensity2d />`.

  v1: open polylines only — no density_2d_filled, no weights, no contour_var
  other than density. Groups with fewer than two points are dropped with a
  warning.

  Migration: none — additive

- ccbb798: <!-- markdownlint-disable MD041 -->

  feat: geom_dotplot + stat_bindot histodot stacked dots (#803)

  Add `geom: "dotplot"` (default `stat: "bindot"`) for histodot stacked points:
  fixed bins via shared bin-breaks, one point per observation, stackdir
  up|down|center|centerwhole, stackratio, and diameter from binwidth × x-scale
  (dotsize; size px override). y is after_stat `stackpos` only. Builder
  `.geomDotplot()` and Svelte `<GeomDotplot />`.

  v1: histodot only — no Wilkinson dotdensity, no binaxis=y, no weights.

  Migration: none — additive

- 7f89e9c: <!-- markdownlint-disable MD041 -->

  feat(geom): geom_qq + geom_qq_line normal Q–Q plots (#804)

  ggplot2-compatible Q–Q scatter and reference line: `aes.sample`, `stat_qq` /
  `stat_qq_line` (normal theory quantiles + quartile line), builder
  `.geomQq()` / `.geomQqLine()`, and `<GeomQq />` / `<GeomQqLine />`.

  Migration: none — additive

- 78fef28: <!-- markdownlint-disable MD041 -->

  feat: geom_quantile + stat_quantile linear RQ lines (#805)

  Add `geom: "quantile"` (default `stat: "quantile"`) with linear y~x
  quantile regression at `params.quantiles` (default 0.25/0.5/0.75).
  Builder `.geomQuantile()` and Svelte `<GeomQuantile />`.

  v1: linear rq only (no rqss / formula / weights). Pinball-minimizing
  order-statistic intercept; pairwise-slope exact search for small n.
  Migration: none — additive

- 0ab78a4: <!-- markdownlint-disable MD041 -->

  feat(geom): add geom_rug marginal edge ticks (#806)

  ggplot2-compatible rug layer: short ticks along panel edges with `sides`
  (`bltr`) and panel-fraction `length`. Builder `.geomRug()` and `<GeomRug />`.

  Migration: none — additive

- a120bed: <!-- markdownlint-disable MD041 -->

  feat: geom_map fortified region join for choropleths (#808)

  Add ggplot2-style `map` geom: join a fortified map table to value rows via
  `aes.map_id` and `params.map` / `params.mapId`. Coordinates from map
  `long`+`lat` or `x`+`y`; optional multipoly `group`. Renders closed filled
  paths per region; missing regions drop with `map-region-missing` warning.

  Intentional subset: no network fetches, no sf/CRS, no public geom_polygon.

  Migration: none — additive

- 3fb062a: <!-- markdownlint-disable MD041 -->

  feat: coord_sf fixed-aspect maps for already-projected data (#809 phase 8)

  Add PortableSpec `{ type: "sf", ratio? }` reusing coord_fixed layout for geom_sf
  maps. Public helpers `coordSf` / `coord_sf`, builder `.coordSf()`, and
  `<CoordSf>`. No CRS reproject or graticules in v1.

  Migration: none — additive

- da5825e: <!-- markdownlint-disable MD041 -->

  # feat: geom_sf_label boxed SF labels (#809 phase 3)

  Add `geom_sf_label`: labels at `stat_sf_coordinates` representative points with
  a measured rounded background box. `color` is ink + box stroke; `fill` is the
  box background. Params: padding, radius, linewidth, size, anchor, dx/dy.

  Builder `.geomSfLabel()` and Svelte `<GeomSfLabel />`. GlyphsBatch optional box
  fields; SVG draws rect then text; hit uses box AABB. Shared path for future
  `geom_label` (#792).

  Migration: none — additive

- 962bf83: <!-- markdownlint-disable MD041 -->

  # feat: geom_sf_text + stat_sf_coordinates labels (#809 phase 2)

  Add `stat_sf_coordinates` (one representative (x,y) per GeoJSON feature) and
  `geom_sf_text` which defaults to that stat and draws `aes.label` at the point.
  Point as-is; MultiPoint/LineString vertex mean; Polygon exterior shoelace
  centroid; Multi* uses the first component only in v1.

  Builder `.geomSfText()` and Svelte `<GeomSfText />`. Requires `aes.label`;
  geometry still as JSON strings in a data column.

  Migration: none — additive

- 2154fe1: <!-- markdownlint-disable MD041 -->

  # feat: geom_sf portable GeoJSON geometries phase 1 (#809)

  Add `geom: "sf"` for already-projected GeoJSON Geometry values stored as JSON
  strings in a data column (default `geometry`). Point/LineString/Polygon and
  their Multi* variants expand to points, open paths, or closed filled rings.
  Interior rings emit a warning; GeometryCollection and mixed families error.

  Builder `.geomSf()` and Svelte `<GeomSf />`. No CRS / `coord_sf` in this phase.

  Migration: none — additive

- 1bc9988: <!-- markdownlint-disable MD041 -->

  feat: geom_spoke origin + angle + radius segments (#810)

  Add ggplot2-style `spoke` geom: endpoints derived as
  `xend = x + radius·cos(angle)`, `yend = y + radius·sin(angle)` in data space
  (then the same position transform as x/y). Angle is radians. Reuses segment
  rendering. CHANNELS gain `angle` and `radius`; constants via `params.angle` /
  `params.radius` when not mapped. Continuous x/y required.

  Migration: none — additive

- f08091b: <!-- markdownlint-disable MD041 -->

  feat(#811): stat_ecdf empirical CDF + line curve step-hv

  Add `stat: "ecdf"` on line layers (y defaults to `{ stat: "ecdf" }`) with
  `params.pad` / `params.n`. Prefer `curve: "step-hv"` for right-continuous
  stairs (mid `step` is wrong for ECDFs). Finite-clamp pad (prepend xmin,0;
  ggplot2 uses ±Inf). Shared path-step helper for step-hv / step-vh / mid.

  Migration: none — additive

- fb9a751: <!-- markdownlint-disable MD041 -->

  # feat: stat_manual portable named per-group transforms (#814)

  Add `stat: "manual"` on point, line, and path with required `params.fun`
  from a portable named registry (`first` | `last` | `mean` | `median` |
  `min` | `max` | `sum`). first/last keep one source row per aesthetic group;
  aggregate funs collapse each group to one synthetic row (x and y aggregated
  independently). No JS callbacks (PortableSpec only).

  Missing `fun` fails loud (`manual-fun-required`); unknown `fun` is schema
  `invalid-enum-value`.

  Migration: none — additive

- 623b9c1: <!-- markdownlint-disable MD041 -->

  # feat: stat_summary_bin continuous x binned y summary (#817)

  Add `stat: "summary_bin"` on point, line, and errorbar — bin continuous x with
  the same break rules as `stat_bin`, then summarize y per non-empty
  (group × bin) with the shared summary fun registry (default mean ± se).

  Emits `x` (bin center), `xmin`/`xmax`, and `y`/`ymin`/`ymax`. Empty bins are
  omitted. No weight channel, no summary_2d/hex in v1.

  Migration: none — additive

- f9690fd: <!-- markdownlint-disable MD041 -->

  feat: convenience geoms jitter, hline, vline (#818)

  Add ggplot2-style geom aliases that normalize to existing marks:

  - `jitter` → `point` + `position: "jitter"` (`geomJitter` / `<GeomJitter>`; flat width/height/seed assemble into `positionParams` at the builder/component boundary)
  - `hline` / `vline` → `rule` (`geomHline` / `geomVline` / components); annotation intercepts suppress plot-aes inheritance; data-driven forms drop the orthogonal axis

  No new mark types.

  Migration: none — additive

- 0c4919c: <!-- markdownlint-disable MD041 -->

  feat(#820): add `bw` / `ThemeBw` complete theme

  Print-friendly white panel, grey grid, and dark rectangular border matching
  the ggplot2 `theme_bw` complete-theme role (clean-room; not R source).
  Available as PortableSpec `theme: "bw"`, builder `.theme("bw")`, and
  `<ThemeBw />`.

  Migration: none — additive

- 769bcbf: # Add theme_linedraw (`linedraw` / ThemeLinedraw)

  Add `linedraw` theme (`theme: "linedraw"`, `<ThemeLinedraw />`) — white panel with black grid, ticks, and panel border for high-contrast line-art / B&W print chrome (#821).

  Migration: none — additive

- d6c72c8: <!-- markdownlint-disable MD041 -->

  feat(#823): add `test` / `ThemeTest` snapshot theme

  Pinned high-contrast complete theme for package tests and VR (ggplot2
  `theme_test` role, clean-room). Available as PortableSpec `theme: "test"`,
  builder `.theme("test")`, and `<ThemeTest />`. Not an alias of product themes.

  Migration: none — additive

- 1a4401d: # Add theme_grey / theme_gray aliases (`grey` / `gray`)

  Register `grey` and `gray` as first-class theme names that share the existing ggplot2 grey-panel token map (`theme: "grey"`, `theme: "gray"`, `<ThemeGrey />`, `<ThemeGray />`). UK/US spellings for ggplot2 `theme_grey` / `theme_gray` muscle memory (#824).

  Migration: none — additive

- 1876fc4: # Add ColorBrewer scale helpers (#825)

  - Palette tables (public ColorBrewer max-n hex) + scheme registration
  - `scale_*_brewer` (discrete), `scale_*_distiller` (continuous), `scale_*_fermenter` (binned)
  - color/colour/fill spellings + Svelte `<ScaleColorBrewer />` etc.
  - `palette` → `scheme`, `direction: -1` → `reverse: true`

  v1 palettes: Set1/2/3, Dark2, Paired, Accent; Blues/Greens/Reds/Oranges/Purples/Greys/YlOrRd/YlGnBu/BuPu; RdYlBu/RdBu/BrBG/Spectral/PuOr.

  Migration: none — additive

- 20b4ddb: <!-- markdownlint-disable MD041 -->

  feat(#828): scale_*_viridis_c/d/b named constructors

  ggplot2-style continuous, discrete, and binned viridis-family helpers for
  color/fill (plus colour aliases and Svelte shells). Discrete scales sample
  evenly across the ramp; `option` selects viridis/magma/plasma/inferno/cividis/turbo.

  Migration: none — additive

- dfbab7c: # Add size area / radius scale family (#830)

  - `sizeUnit`: `"area"` (default continuous), `"radius"` (linear), `"area_zero"` (zero→zero area)
  - Helpers: `scaleSizeArea` / `scaleSizeBinnedArea` / `scaleRadius` / `scaleSizeOrdinal` + snake aliases; bare `scale_size`
  - `maxSize` option on area helpers (default 6) when `range` is omitted
  - Svelte: `<ScaleSizeArea />`, `<ScaleSizeBinnedArea />`, `<ScaleRadius />`, `<ScaleSizeOrdinal />`
  - Range values may be 0 so zero-area bubbles are portable

  Migration: none — additive

- 52d05ee: # Add scale_x_time / scale_y_time time-of-day position scales (#831)

  - New `temporalKind: "time"` for time-of-day (distinct from date/datetime)
  - Helpers: `scaleXTime` / `scaleYTime` / `scale_x_time` / `scale_y_time` + builder methods
  - Portable numbers are **seconds since midnight** → epoch ms on 1970-01-01Z; Date values use UTC clock portion
  - Default axis labels use `%H:%M:%S`; tick intervals prefer hour/minute/second
  - Svelte: `<ScaleXTime />` / `<ScaleYTime />`

  Migration: none — additive

- 0c12fcb: # Add bare scale_alpha / scale_linewidth and ordinal style aliases (#832)

  ggplot2 ergonomics for style scales:

  - Bare `scale_alpha` / `scale_linewidth` → continuous helpers
  - `scale_alpha_ordinal` / `scale_linewidth_ordinal` / `scale_shape_ordinal` (and camelCase peers) → existing discrete helpers (`type: "ordinal"`)
  - Svelte re-exports: `<ScaleAlphaOrdinal />`, `<ScaleLinewidthOrdinal />`, `<ScaleShapeOrdinal />` (same shells as Discrete)

  Deferred: `scale_shape_continuous` / `scale_linetype_continuous` (ggplot2 warns/errors).

  Migration: none — additive

### Patch Changes

- 3388a69: # Scope interaction nearest-hits to the semantic viewport panel

  Faceted hover and point select can no longer seed another facet's candidate (#787).

- 5ad437b: # Add geom_abline slope/intercept reference lines

  Annotation-only `geom: "abline"` with `params.slope` (default 1) and `params.intercept` (default 0). Clips y = intercept + slope·x to continuous panel domains and emits a segment batch. Builder `.geomAbline()` and `<GeomAbline />` (#790).

- be9687f: # Add theme_void / ThemeVoid chrome-free theme

  Add `theme: "void"` / `<ThemeVoid />` (ggplot2 theme_void) — no axes, grid, or panel chrome for maps and pure-mark composition (#822).

  New theme tokens `labelsX` / `labelsY` gate axis tick labels (and layout margin) so void can suppress text without changing tick-mark behavior on existing themes.

- 6ff72f5: # Add scale_*_gradient / gradient2 / gradientn helpers

  ggplot2-shaped continuous colour constructors for color and fill: two-stop `gradient`, three-stop diverging `gradient2`, and n-stop `gradientn` (colours/colors/values). Map onto sequential scales with explicit range (#826). No asymmetric `midpoint` domain remapping in v1.

- 8114eb2: # Add scale_*_steps / steps2 / stepsn helpers

  ggplot2-shaped binned continuous colour constructors for color and fill: two-stop `steps`, three-stop diverging `steps2`, and n-stop `stepsn`. Map onto `type: "binned"` with explicit hex range (#827). No midpoint domain remapping in v1.

- 8f75eb3: # Add scale_*_hue / grey / gray / ordinal discrete colour helpers

  Register portable schemes `hue`, `grey`, and `gray`, plus ggplot2-shaped constructors for color and fill. Custom hue h/c/l or grey start/end bake a 10-stop range; defaults use named schemes. `scale_*_ordinal` aliases discrete (#829).

- 1ed929a: # Escape discard of pending pin stash

  Escape (and setInspection clear) now discard the pending pin-restore stash so a later re-pin cannot restore a pre-dismiss candidate (#856).

- 57d6688: <!-- markdownlint-disable MD041 -->

  fix: trim canvas-scatter showcase so VR smoke stays under budget (#926)

  Reduce the gallery specimen from 10k to 2.5k marks (still above
  `CANVAS_AUTO_THRESHOLD`) so Playwright VR/gallery capture finish without a
  180s timeout mask. Wall time under headless Chromium scaled roughly with mark
  count (~156s at 10k → ~42s at 2.5k).

  Migration: none — docs/example display density only; no public API change.

- 1f60f29: <!-- markdownlint-disable MD041 -->

  fix: humanize default axis and legend titles from field names (#961)

  When `labs` omits a channel, guide titles now use `humanizeFieldTitle` —
  camelCase/snake_case field names become sentence case (`bloomRefDate` →
  `Bloom ref date`). Single-token names (`year`, `Region`, `count`) stay as
  authored. Explicit `labs` values (including `""` to hide) are unchanged.

  Also exports `spaceFieldName` / `humanizeFieldTitle` from `@ggsvelte/core`;
  tooltip `<dt>` labels share the spacing helper.

  Migration: none — additive

  Default axis/legend titles for multi-word field names change from raw
  identifiers to sentence case (e.g. `bloomRefDate` → `Bloom ref date`). Set
  `labs` explicitly to keep a previous string.

- Updated dependencies [eeaa980]
- Updated dependencies [3388a69]
- Updated dependencies [3ec23b0]
- Updated dependencies [c2e3856]
- Updated dependencies [5ad437b]
- Updated dependencies [f2c0997]
- Updated dependencies [e90a228]
- Updated dependencies [38af6a8]
- Updated dependencies [cac7d43]
- Updated dependencies [a89cc93]
- Updated dependencies [f0f379c]
- Updated dependencies [40a43f9]
- Updated dependencies [158576b]
- Updated dependencies [a832c75]
- Updated dependencies [c11861d]
- Updated dependencies [b90e651]
- Updated dependencies [ccbb798]
- Updated dependencies [7f89e9c]
- Updated dependencies [78fef28]
- Updated dependencies [0ab78a4]
- Updated dependencies [a120bed]
- Updated dependencies [3fb062a]
- Updated dependencies [da5825e]
- Updated dependencies [962bf83]
- Updated dependencies [2154fe1]
- Updated dependencies [cb8ba46]
- Updated dependencies [5584a49]
- Updated dependencies [93dd535]
- Updated dependencies [757b3f5]
- Updated dependencies [26cfa45]
- Updated dependencies [1bc9988]
- Updated dependencies [f08091b]
- Updated dependencies [dbb883b]
- Updated dependencies [985ae06]
- Updated dependencies [fb9a751]
- Updated dependencies [c0ba287]
- Updated dependencies [05b0736]
- Updated dependencies [623b9c1]
- Updated dependencies [f9690fd]
- Updated dependencies [0c4919c]
- Updated dependencies [769bcbf]
- Updated dependencies [be9687f]
- Updated dependencies [d6c72c8]
- Updated dependencies [1a4401d]
- Updated dependencies [1876fc4]
- Updated dependencies [6ff72f5]
- Updated dependencies [8114eb2]
- Updated dependencies [20b4ddb]
- Updated dependencies [8f75eb3]
- Updated dependencies [dfbab7c]
- Updated dependencies [52d05ee]
- Updated dependencies [0c12fcb]
- Updated dependencies [4771f3e]
- Updated dependencies [0e8dbda]
- Updated dependencies [f6eb71a]
- Updated dependencies [fac1f70]
- Updated dependencies [57d6688]
- Updated dependencies [bbbcbd6]
- Updated dependencies [1f60f29]
- Updated dependencies [36ef799]
- Updated dependencies [4428488]
  - @ggsvelte/core@0.12.0
  - @ggsvelte/spec@0.12.0

## 0.11.1

### Patch Changes

- c198432: <!-- markdownlint-disable MD041 -->

  refactor(#659): compose the repo's own charts as child layers (slice 8)

  The docs site, the getting-started tutorial, the package README, the bundled
  agent skill, and the clean-consumer compatibility harness no longer pass the
  grammar props deprecated in 0.11.0 — they use `<Scale>`, `<Labs>`, `<Guides>`,
  `<Coord>`, `<Facet>`, and the theme shells instead. A new guard runs
  `ggsvelte-codemod`'s own transform over those sources and fails if any of them
  would still change.

- c198432: <!-- markdownlint-disable MD041 -->

  docs(#659): teach the child-layer API in the guide (slice 9)

  Every Svelte snippet outside the upgrading page now composes scales, guides,
  coordinates, facets, labels, and themes as children rather than as the props
  deprecated in 0.11.0, and the copy-ready snippets on the themes page follow.
  The upgrading guide keeps the old form on purpose — it is the page that
  migrates away from it — and a guard asserts that exemption stays earned.

- Updated dependencies [92564eb]
  - @ggsvelte/core@0.11.1
  - @ggsvelte/spec@0.11.1

## 0.11.0

### Minor Changes

- d458ddb: <!-- markdownlint-disable MD041 -->

  feat: theme children + deprecate GGPlot `theme` prop

  Ship declaration-only `<Theme>` / `<ThemeDark>` / … children (stable-intent),
  fold non-mark plot layers after props so children win, and deliver a
  once-per-instance `DEPRECATED_PLOT_PROP` advisory through `ondiagnostic`
  (`PlotDiagnostic` union). Rename `LayerDescriptor` → `MarkLayerDescriptor`
  (deprecated type alias kept until 0.13.0).

  Migration: <https://ggsvelte.sh/guide/upgrading#compose-the-theme-as-a-child-layer>

- 0f457f1: <!-- markdownlint-disable MD041 -->

  feat: scale children (color/fill) + deprecate GGPlot `scales` prop

  Ship declaration-only `<Scale>` / `<ScaleColor*>` / `<ScaleFill*>` / Colour
  aliases (stable-intent), fold scale children after props so children win per
  channel, deliver a once-per-instance `DEPRECATED_PLOT_PROP` advisory for the
  `scales` prop, and emit `DUPLICATE_SCALE_CHANNEL` when two scale children
  collide on one aesthetic. `PlotDiagnostic` widens to
  `InteractionDiagnostic | DeprecationDiagnostic | CompositionDiagnostic`
  (exhaustive `switch` on `.code` needs a new arm; annotated handlers keep
  working).

  Migration: <https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers>

- 0e96701: <!-- markdownlint-disable MD041 -->

  feat: generate all scale child shells via codegen (#659 slice 4)

  Add position and style `<Scale*>` shells (45 new) and regenerate the 18
  color/fill shells from a single manifest-driven generator
  (`bun run scale:children:gen`). Every `SCALE_CAPABILITIES` family now has a
  declaration-only child; `<Scale value={…}/>` remains the escape hatch for
  raw/computed fragments. The `scales` prop deprecation already shipped in
  slice 3.

  Migration: none — additive

- b512a74: <!-- markdownlint-disable MD041 -->

  feat: coord + facet children + deprecate GGPlot `coord` / `facet` props

  Ship declaration-only `<Coord>` / `<CoordFlip>` / `<CoordFixed>` /
  `<CoordEqual>` / `<CoordTransform>` / `<CoordCartesian>` and `<Facet>` /
  `<FacetWrap>` / `<FacetGrid>` children (stable-intent). Both families are
  REPLACE (last child wins over props and earlier children). Deliver
  `DEPRECATED_PLOT_PROP` for the `coord` and `facet` props (since 0.11.0,
  remove in 0.13.0) and `DUPLICATE_PLOT_LAYER` when two coord, facet, or theme
  children are registered (composition diagnostics become a discriminated
  union with the existing `DUPLICATE_SCALE_CHANNEL` scale variant).

  Migration: <https://ggsvelte.sh/guide/upgrading#compose-coord-as-a-child-layer>
  Migration: <https://ggsvelte.sh/guide/upgrading#compose-facet-as-a-child-layer>

- 9e2a271: <!-- markdownlint-disable MD041 -->

  feat(#659): labs + guides + legend children, deprecate the props (slice 6)

  Ship declaration-only `<Labs>`, `<Guide*>` and `<Legend>` layers — the last
  three grammar props to move off `<GGPlot>`.

  - `<Labs title x color …/>` — the whole flat Labs surface as named props. No
    `value` escape hatch: `<Labs {...computed} />` already covers it.
  - `<GuideAxis/>`, `<GuideLegend/>`, `<GuideColorbar/>`, `<GuideColorsteps/>`,
    `<GuideNone/>` — one shell per guide TYPE, each keyed by a `channel` prop
    (the aesthetic is a key, not part of the component name), plus
    `<Guides value={…}/>` for raw or computed guide bags.
  - `<Legend order="sorted"/>` — the plot-wide entry-SORT enum. Deliberately
    separate from `<GuideLegend order={2}/>`, which is a per-aesthetic integer
    placement rank; same word, unrelated concepts.

  Deprecates the `labs`, `guides` and `legend` props (since 0.11.0, removable in
  0.13.0) with upgrading-guide anchors. Children still win over props (D2).

  All three are keyed-MERGE families, so a new `DUPLICATE_MERGE_KEY` composition
  advisory fires when two children write the same key — the later one wins, and
  siblings touching different keys all survive. `DUPLICATE_SCALE_CHANNEL` keeps
  its own code: it shipped in 0.11.0 and its `channel` field and spelling-alias
  suggestion are scale-specific. `CompositionDiagnostic` widens accordingly, so
  exhaustive `switch`es on `.code` need one new arm.

  **Type rename on `@ggsvelte/svelte` only:** the `Labs` spec type is re-exported
  there as `LabsSpec`, because the new `<Labs>` component claims the bare name
  (every grammar child is named for the PortableSpec field it fills, and `Labs`
  is the only spec type without a `Spec`/`Input` suffix). `import type { Labs }
from "@ggsvelte/spec"` is unchanged and remains canonical; only the
  `@ggsvelte/svelte` re-export moved. Using the old name against a `Labs` object
  is a compile error, not a silent mistype.

  Migration: <https://ggsvelte.sh/guide/upgrading#compose-labs-as-a-child-layer>
  Migration: <https://ggsvelte.sh/guide/upgrading#compose-guides-as-child-layers>
  Migration: <https://ggsvelte.sh/guide/upgrading#compose-legend-as-a-child-layer>

- f58fa66: <!-- markdownlint-disable MD041 -->

  feat(#659): ship the plot-props codemod (slice 7, closes #290)

  Add `ggsvelte-codemod`, the first codemod under ADR 0013's policy: it migrates
  the seven grammar props deprecated in 0.11.0 — `facet`, `coord`, `scales`,
  `guides`, `legend`, `theme`, `labs` — into the child layers that replace them.

  ```bash
  npx ggsvelte-codemod src          # diff only, writes nothing
  npx ggsvelte-codemod --write src  # apply
  ```

  Dry-run by default, writes only behind `--write`, per ADR 0013's rule that
  checks and codemods never rewrite code implicitly. Migrated children are
  inserted before any child the file already had, so a hand-written
  `<ScaleColorDiscrete/>` keeps winning over a migrated `scales` prop (D2:
  props apply first, then children in registration order).

  Scoped to meaning-preserving rewrites, never style. It targets the generic
  escape hatches (`<Coord value={…}/>`, `<Scale value={…}/>`, `<Guides
value={…}/>`) rather than named shells, because for scales the named form is
  not byte-identity-preserving (D8 — `normalize()` does not infer scale `type`).
  Flat bags expand to named props (`labs={{ title: "Sales" }}` →
  `<Labs title="Sales"/>`), falling back to `<Labs {...expr}/>` when an object
  literal cannot be expanded losslessly. `theme={expr}` with a non-literal value
  is deliberately NOT rewritten — `theme` is `ThemeName | ThemeSpec` and
  `<Theme>` has no `value` hatch — and is reported as `manual change required`
  with the guide anchor instead of being half-migrated.

  Only files importing `GGPlot` from `@ggsvelte/svelte` are touched, so a
  consumer's own `GGPlot` is never rewritten.

  Fixtures live at `packages/svelte/tests/codemod/fixtures/<from>-<to>/<case>/`
  per ADR 0013 and assert the acceptance criteria directly: idempotence, edits
  confined to the rewritten ranges, and unrecognized shapes left untouched with
  a printed pointer.

  Migration: <https://ggsvelte.sh/guide/upgrading#migrate-the-grammar-props-with-the-codemod>

- fc5a8fc: <!-- markdownlint-disable MD041 -->

  Add `@ggsvelte/svelte/data` with the bundled `kyotoSakura` teaching dataset —
  838 peak cherry-blossom dates for Kyoto, 812–2026 CE, typed rows plus a
  `KYOTO_SAKURA_CITATION` string. It backs the getting-started lesson, so the
  quickstart file you copy builds in a bare app with no extra downloads. Data
  copyright Yasuyuki Aono; see NOTICE for the full attribution.

  Migration: none — additive

### Patch Changes

- cdb06ee: <!-- markdownlint-disable MD041 -->

  feat: widen LayerRegistry for non-mark plot layers

  Add a `Layer` union (mark + scale/theme/coord/facet/labs/guides/legend),
  `markLayers` / `registerPlotLayer`, and fold non-mark `plotLayers` into
  assembly after the existing gates. No public behaviour change: no non-mark
  components ship yet, and mark consumers read `markLayers`.

  Migration: none — additive

- 87411a3: <!-- markdownlint-disable MD041 -->

  fix: quieter point inspection and readable axis/tooltip chrome

  - Points and text auto-inspect as `exact` (hover ring only), not full `xy`
    crosshair grouping — axis modes remain opt-in (`mode: "x"|"y"|"xy"`).
  - Default tooltips omit the shared axis field under `x`/`y` mode and humanize
    camelCase column names for `<dt>` labels.
  - Raise light/minimal-family `axisTextSize` (8.8 → 12), base `axisTitleSize`
    (9 → 11.5), and reduce default tooltip font size (16 → 12.5) so tick labels
    are readable next to titles and tooltips.

  Migration: none for most plots. If you relied on `inspect: true` / auto mode
  drawing a full crosshair on scatter points, set `inspect={{ mode: "xy" }}`
  (or `"x"` / `"y"`) explicitly. Visual baselines for light-theme smoke shots
  refresh with the larger axis type.

- 902e331: <!-- markdownlint-disable MD041 -->

  fix: default tooltips use labs titles and theme font size

  - Default tooltip field labels prefer explicit `labs` titles for x/y/color/fill
    (and other aesthetic lab keys), then lightly humanized column names.
  - Tooltip type size tracks `theme.fontSize` instead of a hard-coded 12.5px
    (residual of #753 hierarchy work).

  Migration: none. Charts with `labs` get more readable default tooltips; custom
  `inspect.content` snippets remain fully author-controlled. Smoke interaction
  VR baselines refresh for the smaller theme-driven tooltip type size.

- Updated dependencies [846ee50]
- Updated dependencies [56b1b09]
- Updated dependencies [0f39d55]
- Updated dependencies [87411a3]
- Updated dependencies [be64829]
  - @ggsvelte/core@0.11.0
  - @ggsvelte/spec@0.11.0

## 0.10.2

### Patch Changes

- fb100fd: <!-- markdownlint-disable MD041 -->

  fix: finish semantic viewport encapsulation for zoom + bounds edit

  Add `normalizedSpan` and `axisEditModel` on the model-owned semantic
  viewport so zoom degeneracy guards and interval bounds editing no longer
  reconstruct pixel normalization, axis reversal, or band slicing from raw
  `PositionScale` details.

  Migration: none for plot authors. Interaction callers that previously
  read `model.scales` for bounds-edit math should use
  `viewport.panel(id).axisEditModel(axis)` and `panel.normalizedSpan(rect)`.

- 0fafeb3: # One mark-paint resolver for three serializers

  Consolidate point/path paint style resolution (shapes, dash, stroke-null) into one `mark-paint` module shared by the SVG, canvas, and Svelte serializers.

  Migration: none — additive public helpers; renderers keep the same visual output.

- Updated dependencies [fb100fd]
- Updated dependencies [0fafeb3]
- Updated dependencies [288eaad]
  - @ggsvelte/core@0.10.2
  - @ggsvelte/spec@0.10.2

## 0.10.1

### Patch Changes

- a787b5d: <!-- markdownlint-disable MD041 -->

  fix: default geom_col/bar inspect is tooltip-only (no sibling mute flicker)

  Bar/column hover no longer mutes sibling marks by default. Instant opacity
  mask toggles at bar gaps caused full-plot flicker under normal pointer
  movement. Default inspection is tooltip/ring-chrome only (rects still skip
  point rings). Opt in with `inspect={{ muteSiblings: true }}`; muted marks
  ease opacity with a short CSS transition (disabled under
  `prefers-reduced-motion`).

  Migration: none for typical charts. Authors who want #386-style relative
  de-emphasis on hover should set `inspect={{ muteSiblings: true }}`.

- 4a31bf1: <!-- markdownlint-disable MD041 -->

  fix: wrap-then−45° hybrid band labels when plain wrap fails (#637)

  Auto categorical labels that cannot wrap now balance multi-word text onto
  ≤2 shorter lines and rotate at −45° before full-string −45°/−90° + truncate.
  Svelte and SVG renderers draw multi-line end-anchored rotated ticks.

  Migration: none — auto layout quality only; author guide pins unchanged

- Updated dependencies [2b31212]
- Updated dependencies [4a31bf1]
  - @ggsvelte/core@0.10.1
  - @ggsvelte/spec@0.10.1

## 0.10.0

### Patch Changes

- 5d04e1f: <!-- markdownlint-disable MD041 -->

  fix: remaining multi-table edges after per-layer DataRef

  Binned axes and fixed histogram bin ranges read each layer filtered table;
  transform diagnostics count filtered (not unfiltered) rows; scale validation
  keeps per-layer field evidence; boxplot outlier lineage is not double-remapped
  under facets; Svelte identity epochs fingerprint geom-child data props.

  Migration: none — corrects multi-table behavior under per-layer data

- 7e3b717: <!-- markdownlint-disable MD041 -->

  Add a model-owned semantic viewport for panel lookup, pixel/domain inversion,
  domain projection, categorical identity resolution, and interval candidate
  queries. Route Svelte interval selection, precise bounds, inspection panel
  lookup, and brush zoom through that shared coordinate boundary.

- af2efc2: <!-- markdownlint-disable MD041 -->

  fix: cap and clip rotated left/right facet strip labels to panel height

  Long side-strip labels no longer paint into neighboring multi-row panels.
  Labels truncate with ellipsis to the panel-height advance budget; SVG/Svelte
  strip chrome clips to the strip band as defense in depth. Strip band width
  is remeasured against that vertical budget.

- Updated dependencies [69415d9]
- Updated dependencies [5d04e1f]
- Updated dependencies [7e3b717]
- Updated dependencies [af2efc2]
- Updated dependencies [127e3fc]
- Updated dependencies [38683bc]
- Updated dependencies [59232e8]
- Updated dependencies [92e7049]
- Updated dependencies [ae74d06]
  - @ggsvelte/spec@0.10.0
  - @ggsvelte/core@0.10.0

## 0.9.0

### Minor Changes

- e45a6a5: # Facet value order, labels, and strip position

  Extend facet field configuration with JSON-serializable options for closed panel order, display labels, and strip placement (issue #590).

  - `facet.wrap|rows|cols.levels` — closed explicit panel order (empty panels for missing levels; unknown data values diagnosed and excluded)
  - `facet.wrap|rows|cols.labels` — display-label map (identity keys stay semantic)
  - `facet.strip.position` — `top` (default) | `bottom` | `left` | `right`; left/right bands are measured and reserved in layout
  - `facet.strip.show` — set `false` to hide strip chrome when labels are authored elsewhere

  Migration: none — additive

  Defaults preserve ascending sort and top strips.

- 463adcf: # Fixed-aspect coordinates

  Add strict `coordFixed`/`coord_fixed`/`coordEqual` authoring and fit exact physical data-unit ratios inside responsive chart chrome. Fixed-scale facets keep equal panels, free positional facets fail early, theme-owned letterbox gutters render consistently across Core and Svelte, and constrained layouts preserve ratio with an explicit degraded diagnostic.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-8-to-0-9>

  Replace outer-wrapper CSS aspect-ratio workarounds with `coord={coordFixed()}`. Fixed coordinates now reject free positional facet scales; use fixed facets or remove the fixed coordinate.

- 6179954: <!-- markdownlint-disable MD041 -->

  feat: add geom segment for finite two-endpoint lines (x,y → xend,yend)

  Migration: none — additive

- f8723b4: <!-- markdownlint-disable MD041 -->

  feat: optional per-layer `data` (DataRef) with multi-table pipeline support

  Migration: none — additive

  Layers may supply their own `{values}` / `{columns}` / `{name}` data; when
  omitted they inherit plot-level data. Shared scales train over the union of
  layer tables, facets replicate annotation layers that omit facet fields, and
  `model.row()` resolves global multi-table source ids. Builder and declaration
  geom sugar accept layer `data` as well.

### Patch Changes

- 1b7bae9: <!-- markdownlint-disable MD041 -->

  fix: do not disable legend filters when a hidden rowless annotation scaled-constant shares a style scale

  A data field mapping + annotation `rule` constant on the same discrete style
  scale still exposes filter controls for the visible data categories. Rowful
  scaled constants that appear as legend entries remain non-filterable.

- Updated dependencies [e45a6a5]
- Updated dependencies [463adcf]
- Updated dependencies [6179954]
- Updated dependencies [f8723b4]
- Updated dependencies [29f05e4]
- Updated dependencies [fd28b89]
  - @ggsvelte/spec@0.9.0
  - @ggsvelte/core@0.9.0

## 0.8.0

### Minor Changes

- 43e05b8: # Complete mapped style aesthetics

  Add complete mapped size, linewidth, alpha, shape, and linetype scale plumbing across strict authoring helpers, grouping, stats, SVG/Canvas/SSR rendering, style-aware legends, inspection, and hit testing.

  Discrete and binned style mappings now participate in implicit grouping. Review layered path geoms and add an explicit `group` mapping where style categories are descriptive rather than structural. Mapped `alpha` is the complete opacity aesthetic rather than a value multiplied by a scalar geom `alpha`; set the scale range to bound mapped opacity.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-7-to-0-8>

- afaaeeb: <!-- markdownlint-disable MD041 -->

  feat: add geom ribbon for precomputed interval bands (x+ymin+ymax or y+xmin+xmax)

  Migration: none — additive

- fcc8ad0: # Responsive guide presentation

  Add strict scale-local and top-level guide APIs, responsive right/bottom guide layout, semantically safe discrete-guide merging, guide theme roles, and merged legend interactions.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-7-to-0-8>

- 737ca85: # Add geom rect, tile, and raster to PortableSpec and all renderers

  Migration: none — additive

  - `rect` maps arbitrary regions with `xmin`/`xmax`/`ymin`/`ymax`
  - `tile` draws center-sized cells (band or continuous) with optional width/height
  - `raster` draws equal-cell dense grids with fill and no per-cell stroke
  - Builder: `geomRect` / `geomTile` / `geomRaster`; Svelte: `<GeomRect>` / `<GeomTile>` / `<GeomRaster>`
  - Mapped color outlines use `strokes[]` on rect batches; tile/raster use center candidate anchors

### Patch Changes

- Updated dependencies [2efb5b2]
- Updated dependencies [43e05b8]
- Updated dependencies [afaaeeb]
- Updated dependencies [fcc8ad0]
- Updated dependencies [737ca85]
  - @ggsvelte/core@0.8.0
  - @ggsvelte/spec@0.8.0

## 0.7.1

### Patch Changes

- 616bcc6: <!-- markdownlint-disable MD041 -->

  fix: geom_col/bar hover uses relative de-emphasis instead of a point ring

  Rect mark inspection no longer draws a circle hover/selection ring at the bar
  anchor. Sibling bars de-emphasize via interaction masks (including keyless
  charts via seed primitive focus). Point-like geoms keep circle chrome.

- Updated dependencies [42b031a]
- Updated dependencies [c4d6b6c]
- Updated dependencies [bbe65c7]
- Updated dependencies [dc6c3fe]
- Updated dependencies [7181580]
- Updated dependencies [7f38860]
- Updated dependencies [b349179]
- Updated dependencies [f66f44b]
- Updated dependencies [1fa684e]
- Updated dependencies [c422da0]
- Updated dependencies [a2c8da0]
- Updated dependencies [94fdbec]
- Updated dependencies [6261ee1]
- Updated dependencies [f1b4a3d]
- Updated dependencies [8b9e95d]
- Updated dependencies [d591a18]
- Updated dependencies [774f6de]
- Updated dependencies [ddc3cd8]
- Updated dependencies [dbdec68]
- Updated dependencies [80905dd]
- Updated dependencies [616bcc6]
- Updated dependencies [328ac7d]
- Updated dependencies [5cebbab]
- Updated dependencies [eeffbb6]
- Updated dependencies [4e5b875]
- Updated dependencies [3f16ec8]
- Updated dependencies [e6d5f6f]
- Updated dependencies [72b01ee]
- Updated dependencies [6afccdc]
- Updated dependencies [c4f91d0]
- Updated dependencies [29f0565]
- Updated dependencies [1fed2f3]
- Updated dependencies [9a366cf]
- Updated dependencies [ec7f21b]
- Updated dependencies [a54932c]
- Updated dependencies [d1f69cb]
- Updated dependencies [9affbb6]
- Updated dependencies [571721f]
- Updated dependencies [f5a8919]
- Updated dependencies [09e6954]
- Updated dependencies [3231dc7]
- Updated dependencies [b278811]
- Updated dependencies [1428eb2]
- Updated dependencies [eeb5ce0]
- Updated dependencies [4e4ec5b]
- Updated dependencies [1f94c1c]
  - @ggsvelte/core@0.7.1
  - @ggsvelte/spec@0.7.1

## 0.7.0

### Minor Changes

- ff4ad4c: # Generic color and fill scale families

  Add complete color/fill scale families with binding-identical color/colour helpers, transformed and temporal ramps, deterministic binned colorsteps, manual and identity mappings, explicit NA/unknown policies, and serializable discrete/colorbar/colorsteps GuidePlans.

  `RenderModel.guidePlans` is now a union: narrow on `plan.type === "axis"` before reading axis-only fields. Explicit continuous color domains censor out-of-domain values by default; set `oob: "squish"` to clamp. See the [0.6 to 0.7 migration guide](https://ggsvelte.sh/guide/upgrading#0-6-to-0-7).

  Migration: <https://ggsvelte.sh/guide/upgrading#0-6-to-0-7>

### Patch Changes

- c44f6bc: <!-- markdownlint-disable MD041 -->

  Measured categorical (band) x-axis label layout. Long `geom_col`/`geom_bar` category labels now wrap onto two lines, then rotate (−45°/−90°), instead of overlapping each other and the axis title — every bar keeps its label. When rotation still can't fit, labels truncate with the full text on the tick `<title>`, and a diagnostic suggests `coord_flip` for horizontal bars. The planner never auto-flips the chart and never thins a low-cardinality axis; vertical (coord_flip) categorical axes keep their existing behavior.

- Updated dependencies [c44f6bc]
- Updated dependencies [ff4ad4c]
  - @ggsvelte/spec@0.7.0
  - @ggsvelte/core@0.7.0

## 0.6.0

### Minor Changes

- 82b3a4d: # Pre-stat position transforms and positional scale families

  Add canonical identity, log10, and square-root position transforms; continuous and binned scale helpers with ggplot2 aliases; source-limit OOB policies; transformed-space stats/positions; semantic guides and interaction inversion; binned count/stack/dodge identities; and default 5% non-temporal expansion.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-5-to-0-6>

  Authored `type: "log"` now canonicalizes to `{ type: "linear", transform: "log10" }` and runs before statistics. Pinned domains censor before stats by default, position and numeric-bin parameters use transformed-space units, and trained/guide/interaction contracts report family `linear` plus `transform`. Use `expand: { mult: 0, add: 0 }` for flush bounds.

- 6b8f64b: # Post-stat coordinate transforms and curved topology

  Add canonical `coordTransform`/`coord_transform` APIs for independent identity, log10, and square-root coordinate projection after statistics; semantic coordinate limits and reversal; optional panel clipping; projected axes/grids; adaptive path and segment tessellation; and coordinate-before-scale interaction inversion.

  Migration: none — additive

  Coordinate transforms are intentionally distinct from scale transforms: use `scaleXLog10()` when statistics should consume log-space values, and `coordTransform({ x: "log10" })` when statistics should remain in scale space and only final geometry should be projected.

### Patch Changes

- 47d9ddd: <!-- markdownlint-disable MD041 -->

  Collapse identical default-tooltip field blocks for multi-layer inspect (line + point) without changing the public inspection member list.

- ed09958: <!-- markdownlint-disable MD041 -->

  Point package homepages and runtime diagnostic guidance at the canonical `https://ggsvelte.sh` documentation origin after the hosting cutover.

- Updated dependencies [82b3a4d]
- Updated dependencies [6b8f64b]
- Updated dependencies [cd7457c]
- Updated dependencies [b08c930]
- Updated dependencies [ed09958]
  - @ggsvelte/spec@0.6.0
  - @ggsvelte/core@0.6.0

## 0.5.1

### Patch Changes

- 85f5b5a: <!-- markdownlint-disable MD041 -->

  Map scale-diagnostic severity onto the CLI stderr `kind` field 1:1 so error-severity diagnostics emit `kind: "error"` instead of being demoted to `warning`.

- Updated dependencies [85f5b5a]
  - @ggsvelte/spec@0.5.1
  - @ggsvelte/core@0.5.1

## 0.5.0

### Minor Changes

- 78c1942: # Temporal guide plans

  Add measured temporal axis plans with calendar-aligned automatic breaks, contextual and complete labels, explicit interval/minor-break controls, locale/timezone formatting, stable diagnostics, and per-panel `RenderModel.guidePlans` inspection.

  Migration: none — additive

### Patch Changes

- 087a4b1: <!-- markdownlint-disable MD041 -->

  Point published package metadata at the live documentation site and identify each package's monorepo directory.

- Updated dependencies [78c1942]
- Updated dependencies [087a4b1]
  - @ggsvelte/spec@0.5.0
  - @ggsvelte/core@0.5.0

## 0.4.0

### Minor Changes

- cfafdd1: # Temporal scale semantics

  Add strict, value-driven date and datetime scales across PortableSpec, fluent builder, and Svelte authoring. Raw four-digit year strings now infer a proportional UTC calendar axis after whole-column validation; ambiguous date orders and identifier-like values remain discrete until explicitly configured.

  Add deterministic named, exact-format, epoch, timezone, and DST-disambiguation parsers; parser-keyed immutable table views; structured scale decisions and diagnostics; ggplot2-style scale aliases; and lubridate-style authoring helpers. Preserve original source values for interactions while using semantic epoch values before stats, positions, scale training, and rendering.

  Migration: <https://ggsvelte.sh/guide/temporal-scales>

  If a four-digit string field is an identifier rather than a calendar year, set the position scale to `type: "band"`, call `scaleXDiscrete()` / `scaleYDiscrete()`, or use the equivalent snake_case alias. Ambiguous DMY/MDY input now requires an explicit parser such as `parse: "dmy"` or `parse: "mdy"`.

### Patch Changes

- f9d62dc: # Temporal agent guidance

  Clarify temporal parser and override behavior in the packaged ggsvelte agent skill.

- Updated dependencies [cfafdd1]
- Updated dependencies [32c207a]
  - @ggsvelte/spec@0.4.0
  - @ggsvelte/core@0.4.0

## 0.3.1

### Patch Changes

- 8b7d672: # Harden the responsive Quickstart path

  Make declaration-only layers server-render on the supported Svelte floor, apply `ariaLabel` to static chart output, commit responsive width and readiness together after collapsed containers recover, and expose the installed package version through `ggsvelte-render --version`.

- Updated dependencies [8b7d672]
- Updated dependencies [2b2f55c]
- Updated dependencies [437ff12]
  - @ggsvelte/core@0.3.1
  - @ggsvelte/spec@0.3.1

## 0.3.0

### Patch Changes

- b8dcf24: # Use CandidateStore for all hit resolution

  Add paint-ordered `CandidateStore.hitTest()` and route Svelte pointer inspection
  through the render model's existing lazy candidate index. Remove the experimental
  `buildHitIndex` and related `@ggsvelte/core/dom` types so interactive plots no
  longer build and retain a second geometry index.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-2-to-0-3>

- e4b02b5: # Delegate keyboard navigation to CandidateStore

  Let `CandidateStore.traverse()` apply modular sequential steps and preserve
  paint order for directional ties. Svelte inspection now delegates sequential,
  directional, and coincident keyboard navigation to the model-owned store
  without materializing a second candidate traversal list.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-2-to-0-3>

- 57e4c85: # Internalize plot interaction assembly

  Internalize controller construction, deferred sibling wiring, shared Candidate
  projection, and lifecycle registration in a deep plot-interaction assembly module.

- 5d95948: # Own semantic Candidate projection once

  Move semantic Candidate traversal, liveness gating, anchor projection, interaction masks, and interval-consumption shaping behind one runtime module seam.

- Updated dependencies [f63e498]
- Updated dependencies [b8dcf24]
- Updated dependencies [30db776]
- Updated dependencies [e4b02b5]
- Updated dependencies [378f73c]
- Updated dependencies [0a7b872]
  - @ggsvelte/spec@0.3.0
  - @ggsvelte/core@0.3.0

## 0.2.1

### Patch Changes

- d724578: # Update the packaged agent skill for v0.2

  Document linked interaction controllers, legend focus and filtering, faceted
  intervals, exact bounds, and the current Svelte peer requirement.

## 0.2.0

### Minor Changes

- ce685ea: # Add linked interactive legend focus

  Add opt-in pointer, touch, and keyboard legend controls; stable-key emphasis
  propagation; renderer-neutral focus masks with SVG/canvas parity; 24-pixel
  legend targets; typed events and diagnostics; and a three-view example.

  Migration: none — additive

- 1fc7b4d: # Add semantic linked-view interaction state

  Add `createPlotInteraction`, controlled selection and zoom, presentation-only
  emphasis, stable semantic scopes, explicit key reconciliation, and a complete
  linked plots-controls-table example.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-1-to-0-2>

- 70b1070: # Add precise filtering and faceted intervals

  Filter discrete legend groups without changing their color identity, coordinate
  durable interval selections across facets with independent, union, or
  cross-panel semantics, and enter exact accessible selection or zoom bounds for
  linear, log, time, reversed, and band scales.

  Migration: none — additive

- 98df82b: # Raise the Svelte peer floor to 5.33.1

  The `svelte` peer range narrows from `^5.29.0` to `^5.33.1`. Svelte 5.33.1
  restored lazy server-side `$derived` evaluation (sveltejs/svelte#15964), so
  the library no longer carries wiring constraints for the 5.29 eager behavior.
  Only the eager-derived declaration constraint is removed — internal controller
  construction order and effect-registration order are unchanged. Consumers on
  Svelte 5.29.0–5.33.0 must upgrade Svelte to take this release.

  Migration: <https://ggsvelte.sh/guide/upgrading#0-1-to-0-2>

### Patch Changes

- f171d83: # Performance and hardening backfill

  Changelog backfill for the performance, bug-fix, and internal-architecture work
  merged between v0.1.1 and this release that did not carry individual
  changesets.

  Performance:

  - Stroked-path hit-testing resolves candidates through an edge AABB shortlist
    (O(log E + k) instead of scanning every edge).
  - Canvas segment strokes batch mirror points and render in Θ(runs); canvas
    accessibility rows are not materialised while the data table is closed.
  - Selection membership checks use parallel `Set`s (O(1) per key), and
    non-union interval walks fuse with a shared candidate projection.
  - Many further allocation and traversal reductions across scales, legends,
    facets, tooltips, and interaction controllers.

  Fixes:

  - Keyed `seedId` pin rebinds require a role match.
  - Legend filter chrome honors `--gg-tooltip-background` and preserves
    contrast; forced-colors paint is deterministic for disabled-at-SSR tool
    buttons.
  - Restored interval selections no longer hit an SSR temporal-dead-zone error.
  - Annotation frames stay rowless for `inputGroups`.

  Internals: source modules were split into smaller single-concern units
  (validate, normalize, error catalog, controllers) with no public API change.

- 9de8100: # Advise on silently-inert interaction wiring

  Two new advisory diagnostics (ADR 0013 ambiguity audit): `interactionScope`
  without an `interaction` controller is ignored and now says so, and an
  interaction handler (`oninspect`/`onselect`/`onzoom`/`onlegendfocus`/
  `onlegendfilter`) whose capability prop is not enabled never fires and now
  says so. Both are delivered once per prop per plot instance through the
  existing `ondiagnostic` channel (dev-only console fallback) and never change
  behavior. The passive controller-consumer pattern stays advisory-free.

  Migration: none — additive

- Updated dependencies [ce685ea]
- Updated dependencies [f171d83]
- Updated dependencies [70b1070]
- Updated dependencies [f171d83]
  - @ggsvelte/core@0.2.0
  - @ggsvelte/spec@0.2.0

## 0.1.1

### Patch Changes

- 6b3b581: # Installable registry dependencies

  Publish registry-compatible internal dependency ranges and verify release-shaped tarballs with npm, matching the actual Changesets publishing path.

- Updated dependencies [6b3b581]
  - @ggsvelte/spec@0.1.1
  - @ggsvelte/core@0.1.1

## 0.1.0

### Minor Changes

- c7aecaa: # First public release

  Publish the first public ggsvelte release: a Svelte 5 grammar of graphics with strong defaults, ggplot2-inspired themes and palettes, responsive bounded rendering, agent-friendly portable specs and diagnostics, hybrid SVG/canvas output, accessible opt-in inspection and brushing, complete interaction documentation, and a release-gated compatibility and quality matrix.

### Patch Changes

- Updated dependencies [c7aecaa]
  - @ggsvelte/spec@0.1.0
  - @ggsvelte/core@0.1.0
