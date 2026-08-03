<!-- Source of truth: packages/spec/src/schema-names.ts (scheme/shape/linetype names), packages/spec/src/capabilities.ts (SCALE_CAPABILITIES), scripts/gen-scale-children.ts (Scale* component generation), packages/spec/src/scale-*.ts helpers. Inventory tables are asserted complete by scripts/skill-content.test.ts. -->

# Scales and palettes

## Scale families

`SCALE_CAPABILITIES` declares seven families. `scaleTypes` are the canonical
post-normalize types; authored aliases never survive `normalize` (e.g. authored
`type: "log"` becomes `{ "type": "linear", "transform": "log10" }` — trained
models never report type `log`).

| Family              | Aesthetics             | Canonical types                               | Transforms            | Authored aliases |
| ------------------- | ---------------------- | --------------------------------------------- | --------------------- | ---------------- |
| position-continuous | x, y                   | linear                                        | identity, log10, sqrt | log              |
| position-binned     | x, y                   | binned                                        | identity, log10, sqrt | —                |
| position-temporal   | x, y                   | time                                          | identity              | —                |
| position-discrete   | x, y                   | band                                          | —                     | —                |
| color-fill          | color, fill            | ordinal, sequential, binned, manual, identity | identity, log10, sqrt | —                |
| numeric-style       | size, linewidth, alpha | sequential, ordinal, binned, manual, identity | identity              | —                |
| finite-style        | shape, linetype        | ordinal, binned, manual, identity             | —                     | —                |

**Ordering contract**: scale transforms run before stats and positions (a
log10 x reshapes what `stat: "smooth"` sees). Coordinate transforms
(`coord: {"type": "transform", ...}`) run after stats and preserve stat inputs.

### Position scales (x/y)

Options on any position scale (`PositionScaleSpec`):

| Option        | Values / default                                            | Notes                                                                           |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `type`        | linear, binned, time, band (+ authored alias log)           | Omit to infer from field type                                                   |
| `transform`   | identity (default), log10 (values > 0), sqrt (values >= 0)  | Only identity on time scales                                                    |
| `domain`      | `[min, max]` (continuous/time) or full category list (band) | Pins the scale; out-of-domain data drops with a warning                         |
| `oob`         | censor (default) or squish                                  | Applied to explicit source limits, before stats                                 |
| `nice`        | boolean, default true                                       | Rounds inferred domain to tick-friendly bounds; ignored with `domain`           |
| `zero`        | boolean                                                     | Bars/cols/areas force true on the measure axis; set false to override           |
| `expand`      | `{ mult, add }`                                             | Default `{mult: 0.05, add: 0}` non-temporal; time axes default to zero          |
| `breaks`      | numbers, or ISO strings on time scales                      | Explicit ticks; on binned scales these are bin boundaries, at most 65 (64 bins) |
| `minorBreaks` | numbers                                                     | Minor gridlines; time scales use `dateMinorBreaks` instead                      |
| `reverse`     | boolean, default false                                      | Flips output direction                                                          |
| `labels`      | format string                                               | Time: strftime-style; numeric: `",d"`, `".1f"`, `".0%"`, `"~s"`                 |
| `naValue`     | number or null (default)                                    | Substitute for missing positional values, after OOB, before transform           |
| `guide`       | GuideSpec                                                   | Axis styling; band axes accept BandAxisGuideSpec                                |

Helper functions additionally accept `limits` as authoring sugar for `domain`
(supplying both throws). `scaleXReverse`/`scaleYReverse` omit the `transform`
and `reverse` options by type. Binned integer ids stay private; guides and
events use semantic values.

```json fragment
"scales": { "x": { "type": "linear", "transform": "log10", "limits": [1, 1000] } }
```

### Color and fill scales

Five types, each gating its own option set (`ColorScaleSpec`; forbidden
options fail schema validation):

- **ordinal** — discrete categories. `scheme` (categorical name, or a
  sequential name for discrete sampling), `range` (explicit hex list),
  `domain`, `domainMode` (`grow` default preserves assignments across filters;
  `data` rebuilds), `reverse`, `onExhaust`. No transform, breaks, oob, labels.
- **sequential** — continuous ramp. `scheme` or `range` (>= 2 colors
  interpolated), `transform`, `domain` `[min, max]`, `breaks` (colorbar
  reference ticks), `oob`, `labels`, temporal parser options. Guide plan:
  `colorbar`.
- **binned** — color steps. Same shape as sequential but `breaks` are ordered
  boundaries (at most 65). Guide plan: `colorsteps`.
- **manual** — explicit mapping. `range` is required and must supply one color
  per `domain` value (mismatched lengths are the `color-manual-domain-range`
  error). No scheme, breaks, reverse, oob, labels, onExhaust.
- **identity** — data cells are the colors. Only `naValue`, `unknownValue`,
  and `guide` are allowed. Each source value is validated as `#rgb`/`#rrggbb`;
  invalid cells map to `unknownValue` with a bounded warning. The guide is
  suppressed by default — force it with `"guide": {"type": "legend", "force": true}`.

`naValue` colors null/missing cells; `unknownValue` colors invalid,
out-of-domain, or unmapped cells. Both default to `#999999`. Bounded warnings
count how many cells fell back. Guide plans are `discrete` (ordinal, manual,
identity), `colorbar` (sequential), or `colorsteps` (binned); identity and
single-entry manual guides need `force: true` to appear. When `type` is
omitted, a named `scheme` selects its family (categorical → ordinal,
sequential name → sequential).

### Style scales

- **numeric-style** (size, linewidth, alpha): sequential, ordinal, binned,
  manual, identity — numeric output ranges instead of colors, identity
  transform only. `sizeUnit` applies to size only (alpha's schema drops it so
  it cannot no-op silently). Manual domain/range length mismatch is
  `style-manual-domain-range`. Extra size helpers: `scaleSizeArea` /
  `scale_size_area` (area-true scaling, ggplot2's recommended default),
  `scaleSizeBinnedArea` / `scale_size_binned_area`, and `scaleRadius` /
  `scale_radius`. Bare ggplot2 names `scale_size`, `scale_linewidth`,
  `scale_alpha` alias the continuous helpers.
- **finite-style** (shape, linetype): ordinal, binned, manual, identity over a
  closed symbol set (see the tables below) — no transform. Manual ranges and
  identity values must be members of the audited name lists.

## The Scale* component system

98 generated `.svelte` shells plus 28 alias exports plus the hand-written
`<Scale>` escape hatch = 127 `Scale*` components exported from
`@ggsvelte/svelte`. Shells are generated by `bun run scale:children:gen`
(scripts/gen-scale-children.ts; `--check` is the drift gate). Do not edit them
by hand.

Which variants exist per channel (aliases in parentheses are extra export
names for the same component):

| Variant                          | X, Y | Color, Fill | Size                   | Linewidth                   | Alpha                   | Shape                   | Linetype                   |
| -------------------------------- | ---- | ----------- | ---------------------- | --------------------------- | ----------------------- | ----------------------- | -------------------------- |
| Continuous                       | yes  | yes         | yes                    | yes                         | yes                     | —                       | —                          |
| Discrete                         | yes  | yes         | yes (ScaleSizeOrdinal) | yes (ScaleLinewidthOrdinal) | yes (ScaleAlphaOrdinal) | yes (ScaleShapeOrdinal) | yes (ScaleLinetypeOrdinal) |
| Binned                           | yes  | yes         | yes                    | yes                         | yes                     | yes                     | yes                        |
| Log10, Sqrt                      | yes  | yes         | —                      | —                           | —                       | —                       | —                          |
| Reverse                          | yes  | —           | —                      | —                           | —                       | —                       | —                          |
| Date, Datetime                   | yes  | yes         | yes                    | yes                         | yes                     | —                       | —                          |
| Time                             | yes  | —           | —                      | —                           | —                       | —                       | —                          |
| Manual, Identity                 | —    | yes         | yes                    | yes                         | yes                     | yes                     | yes                        |
| Ordinal                          | —    | yes         | (alias)                | (alias)                     | (alias)                 | (alias)                 | (alias)                    |
| Brewer, Distiller, Fermenter     | —    | yes         | —                      | —                           | —                       | —                       | —                          |
| Steps, Steps2, Stepsn            | —    | yes         | —                      | —                           | —                       | —                       | —                          |
| Gradient, Gradient2, Gradientn   | —    | yes         | —                      | —                           | —                       | —                       | —                          |
| Hue, Grey                        | —    | yes         | —                      | —                           | —                       | —                       | —                          |
| ViridisC, ViridisD, ViridisB     | —    | yes         | —                      | —                           | —                       | —                       | —                          |
| Area, BinnedArea (+ ScaleRadius) | —    | —           | yes                    | —                           | —                       | —                       | —                          |

Every `ScaleColor*` component also exports a British `ScaleColour*` alias (24
aliases; same file, same binding). `ScaleColorOrdinal` is a distinct component
(explicit ordinal family), unlike the style-channel Ordinal names which are
re-exports of the Discrete shells.

**Function-twin pattern.** Every shell wraps one camelCase helper from
`@ggsvelte/spec`; the component's props are that helper's options object
flattened (undefined props are stripped). Each camelCase helper has a
binding-identical ggplot2 snake_case twin, and every Color helper has a
binding-identical Colour twin: `scaleXLog10` is `scale_x_log10`;
`scaleColourBrewer` is `scaleColorBrewer` is `scale_color_brewer` is
`scale_colour_brewer`. Brewer/Distiller/Fermenter and Viridis helpers accept
ggplot2's `palette`/`option` (maps to `scheme`) and `direction` (`-1` sets
`reverse: true`).

```svelte fragment
<GGPlot
  data={rows}
  aes={{ x: "day", y: "kwh", color: "site" }}
  layers={[{ geom: "line" }]}
>
  <ScaleXDate dateBreaks="1 month" dateLabels="%b %Y" />
  <ScaleColorBrewer palette="Dark2" />
</GGPlot>
```

**Escape hatch.** `<Scale value={scalesFragment} />` registers a raw `Scales`
fragment — use it for computed scales or variable references. It is
byte-identity-preserving: `value` is not routed through any helper.

## Palettes

### Categorical schemes (40)

| Scheme                    | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| observable10              | Default: 10-hue Observable 10 palette                              |
| ipsum                     | hrbrthemes ipsum palette, published source order                   |
| flexoki                   | Flexoki light-background qualitative palette                       |
| tableau10                 | Tableau 10 qualitative palette                                     |
| colorblind                | ggthemes 8-color colorblind-safe palette                           |
| stata                     | ggthemes Stata s2color scheme (15 colors, the default)             |
| economist                 | ggthemes Economist blues/greens (scale_colour/fill_economist)      |
| solarized                 | ggthemes Solarized accents, blue first (scale_*_solarized)         |
| few                       | ggthemes Few "Medium" — the default `scale_colour_few` palette     |
| few_light                 | ggthemes Few "Light" — for filled areas (`scale_fill_few` default) |
| few_dark                  | ggthemes Few "Dark" — for thin lines and highlighting              |
| fivethirtyeight           | ggthemes FiveThirtyEight three-color line palette (blue/red/green) |
| ptol                      | ggthemes Paul Tol qualitative 12 (full-capacity order)             |
| canva                     | ggthemes Canva "Fresh and bright" 4 (the `scale_*_canva` default)  |
| wsj                       | ggthemes WSJ colors6 — the default `scale_*_wsj` palette           |
| wsj_rgby                  | ggthemes WSJ red/green/blue/yellow                                 |
| wsj_red_green             | ggthemes WSJ green/red good–bad pair                               |
| wsj_black_green           | ggthemes WSJ black-to-green sentiment scale                        |
| wsj_dem_rep               | ggthemes WSJ Democrat/Republican/Undecided                         |
| tableau20                 | ggthemes Tableau 20 (classic paired set)                           |
| tableau_colorblind        | ggthemes Tableau Color Blind 10                                    |
| tableau_seattle_grays     | ggthemes Tableau Seattle Grays (5)                                 |
| tableau_miller_stone      | ggthemes Tableau Miller Stone (11)                                 |
| tableau_superfishel_stone | ggthemes Tableau Superfishel Stone (10)                            |
| tableau_nuriel_stone      | ggthemes Tableau Nuriel Stone (9)                                  |
| tableau_jewel_bright      | ggthemes Tableau Jewel Bright (9)                                  |
| tableau_summer            | ggthemes Tableau Summer (8)                                        |
| tableau_winter            | ggthemes Tableau Winter (10)                                       |
| tableau_green_orange_teal | ggthemes Tableau Green-Orange-Teal (12)                            |
| tableau_red_blue_brown    | ggthemes Tableau Red-Blue-Brown (12)                               |
| tableau_purple_pink_gray  | ggthemes Tableau Purple-Pink-Gray (12)                             |
| tableau_hue_circle        | ggthemes Tableau Hue Circle (19)                                   |
| gdocs                     | ggthemes Google Docs colors (6 hues × 4 strengths, verbatim)       |
| pander                    | ggthemes pander colorblind/printer-friendly 8 (Okabe-Ito order)    |
| Dark2                     | ColorBrewer qualitative, dark tones                                |
| Paired                    | ColorBrewer qualitative, light/dark pairs                          |
| Accent                    | ColorBrewer qualitative, accented mix                              |
| hue                       | Evenly spaced HSL hues — the ggplot2-shaped `scale_*_hue` default  |
| grey                      | Greyscale discrete ramp (`scale_*_grey`)                           |
| gray (alias of grey)      | Same scheme, US spelling — identical colors                        |

`grey` and `gray` are the same scheme; both spellings validate and produce
identical output. Sequential scheme names are also legal on ordinal scales
(discrete sampling along the ramp — what `scale_*_viridis_d` does).

**Palette exhaustion** (`onExhaust`, ordinal scales only): `cycle` (default)
restarts the palette and emits the bounded `palette-exhausted` warning once;
`error` throws the `palette-exhausted` pipeline error instead.

### Sequential schemes (50)

| Scheme                          | Description                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| viridis                         | Default sequential: perceptually uniform purple→yellow      |
| magma                           | Perceptually uniform black→red→pale yellow                  |
| plasma                          | Perceptually uniform blue→magenta→yellow                    |
| inferno                         | Perceptually uniform black→orange→yellow                    |
| cividis                         | Colorblind-optimized blue→yellow                            |
| turbo                           | Google turbo rainbow (high contrast, not uniform)           |
| Blues                           | ColorBrewer single-hue light→dark blue                      |
| Greens                          | ColorBrewer single-hue light→dark green                     |
| Reds                            | ColorBrewer single-hue light→dark red                       |
| Oranges                         | ColorBrewer single-hue light→dark orange                    |
| Purples                         | ColorBrewer single-hue light→dark purple                    |
| Greys                           | ColorBrewer single-hue light→dark grey                      |
| YlOrRd                          | ColorBrewer multi-hue yellow→orange→red                     |
| YlGnBu                          | ColorBrewer multi-hue yellow→green→blue                     |
| BuPu                            | ColorBrewer multi-hue blue→purple                           |
| RdYlBu                          | ColorBrewer diverging red→yellow→blue                       |
| RdBu                            | ColorBrewer diverging red→white→blue                        |
| BrBG                            | ColorBrewer diverging brown→teal                            |
| Spectral                        | ColorBrewer diverging rainbow                               |
| PuOr                            | ColorBrewer diverging purple→orange                         |
| `tableau_seq_blue_green`        | ggthemes Tableau Blue-Green sequential ramp (7 stops)       |
| `tableau_seq_blue_light`        | ggthemes Tableau Blue Light sequential ramp (7 stops)       |
| `tableau_seq_orange_light`      | ggthemes Tableau Orange Light sequential ramp (7 stops)     |
| `tableau_seq_blue`              | ggthemes Tableau Blue sequential ramp (20 stops)            |
| `tableau_seq_orange`            | ggthemes Tableau Orange sequential ramp (20 stops)          |
| `tableau_seq_green`             | ggthemes Tableau Green sequential ramp (20 stops)           |
| `tableau_seq_red`               | ggthemes Tableau Red sequential ramp (20 stops)             |
| `tableau_seq_purple`            | ggthemes Tableau Purple sequential ramp (20 stops)          |
| `tableau_seq_brown`             | ggthemes Tableau Brown sequential ramp (20 stops)           |
| `tableau_seq_gray`              | ggthemes Tableau Gray sequential ramp (20 stops)            |
| `tableau_seq_gray_warm`         | ggthemes Tableau Gray Warm sequential ramp (20 stops)       |
| `tableau_seq_blue_teal`         | ggthemes Tableau Blue-Teal sequential ramp (20 stops)       |
| `tableau_seq_orange_gold`       | ggthemes Tableau Orange-Gold sequential ramp (20 stops)     |
| `tableau_seq_green_gold`        | ggthemes Tableau Green-Gold sequential ramp (20 stops)      |
| `tableau_seq_red_gold`          | ggthemes Tableau Red-Gold sequential ramp (21 stops)        |
| `tableau_div_orange_blue`       | ggthemes Tableau Orange-Blue diverging ramp (7 stops)       |
| `tableau_div_red_green`         | ggthemes Tableau Red-Green diverging ramp (7 stops)         |
| `tableau_div_green_blue`        | ggthemes Tableau Green-Blue diverging ramp (7 stops)        |
| `tableau_div_red_blue`          | ggthemes Tableau Red-Blue diverging ramp (7 stops)          |
| `tableau_div_red_black`         | ggthemes Tableau Red-Black diverging ramp (7 stops)         |
| `tableau_div_gold_purple`       | ggthemes Tableau Gold-Purple diverging ramp (7 stops)       |
| `tableau_div_red_green_gold`    | ggthemes Tableau Red-Green-Gold diverging ramp (7 stops)    |
| `tableau_div_sunset_sunrise`    | ggthemes Tableau Sunset-Sunrise diverging ramp (7 stops)    |
| `tableau_div_orange_blue_white` | ggthemes Tableau Orange-Blue-White diverging ramp (7 stops) |
| `tableau_div_red_green_white`   | ggthemes Tableau Red-Green-White diverging ramp (7 stops)   |
| `tableau_div_green_blue_white`  | ggthemes Tableau Green-Blue-White diverging ramp (7 stops)  |
| `tableau_div_red_blue_white`    | ggthemes Tableau Red-Blue-White diverging ramp (7 stops)    |
| `tableau_div_red_black_white`   | ggthemes Tableau Red-Black-White diverging ramp (7 stops)   |
| `tableau_div_orange_blue_light` | ggthemes Tableau Orange-Blue Light diverging ramp (7 stops) |
| `tableau_div_temperature`       | ggthemes Tableau Temperature diverging ramp (7 stops)       |

### Finite symbol sets (default assignment order)

| Point shapes (6) | Linetypes (6) |
| ---------------- | ------------- |
| circle           | solid         |
| triangle         | dashed        |
| square           | dotted        |
| diamond          | dotdash       |
| plus             | longdash      |
| cross            | twodash       |

## Temporal scales

**Auto-inference.** ISO dates and date-times, four-digit-year strings,
year-months, month-years, and year-quarters infer a time scale after bounded
sampling plus whole-column validation. Ambiguous ordered dates (`01/02/2026`)
stay discrete — set `"parse": "dmy"` or `"parse": "mdy"`. For year-like
identifiers that are labels, not instants, force `{"type": "band"}`. Never
preprocess dates into row indexes. Explicit `linear`/`binned` (including
authored `log`) disables temporal inference, so numeric strings stay
quantitative. Explicit ordinal color/fill keeps temporal-looking labels as
separate groups; sequential temporal color/fill parses domains and uses
calendar legend labels.

**Time-scale options** (position and sequential/binned color scales):

| Option                          | Values / default                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse`                         | Named parser (`"iso"`, `"year"`, `"ym"`, `"my"`, `"yq"`, `"ymd"`, `"ydm"`, `"mdy"`, `"myd"`, `"dmy"`, `"dym"`, and their `_hm`/`_hms` variants), exact `{ "format": "..." }`, or `{ "epoch": "seconds" \| "milliseconds" }` |
| `parseFailure`                  | `error` (default) stops with bounded evidence; `censor` drops invalid values to missing with a warning. Censoring requires an explicit parser                                                                               |
| `temporalKind`                  | `date` (calendar dates), `datetime` (instants), `time` (position only: time of day)                                                                                                                                         |
| `timezone`                      | IANA zone for timezone-less input; default `UTC`                                                                                                                                                                            |
| `disambiguation`                | DST gap/fold policy: `reject` (default), `earlier`, `later`, `compatible`                                                                                                                                                   |
| `dateBreaks`, `dateMinorBreaks` | `"<step> <unit>"`, e.g. `"2 weeks"`; units millisecond…year, step 1–1,000,000                                                                                                                                               |
| `dateLabels`                    | Strict tokens: `%Y %y %m %b %B %d %e %a %A %H %I %M %S %L %p %q %z %Z %%`                                                                                                                                                   |
| `locale`                        | BCP 47 tag for labels; default `en-US`                                                                                                                                                                                      |
| `weekStart`                     | Weekday for week boundaries; default `monday`                                                                                                                                                                               |

**Precedence**: explicit `breaks` outrank `dateBreaks`; `dateLabels` outranks
`labels`. Authored labels are preserved with a diagnostic — never silently
rotated, thinned, or truncated. Automatic temporal labels use measured panel
extent and calendar boundaries; inspect `model.guidePlans` for the selected
interval and labels.

**Authoring surfaces.** The `gg()` builder has `.scaleXDate()`,
`.scaleXDatetime()`, `.scaleXTime()` (and Y forms), each with component twins
(`<ScaleXDate/>` …) and function twins (`scaleXDate`/`scale_x_date` …).
Date helpers serialize mapped authoring `Date` cells as calendar dates;
datetime helpers preserve instants. `scaleXTime`/`scale_x_time` is time-of-day
only: portable numbers are **seconds since midnight** (mapped to epoch ms on
1970-01-01Z), `Date` cells use the UTC clock portion, and default labels are
`%H:%M:%S`.

**Parser helpers** (from `@ggsvelte/spec`): `ymd`, `ydm`, `mdy`, `myd`, `dmy`,
`dym` (each also as `_hm`/`_hms`, e.g. `dmy_hms`), `ym`, `my`, `yq`,
`parseTemporalFormat(value, format)`, `fromEpochSeconds`,
`fromEpochMilliseconds`. Each accepts one value or an array, returns `Date`(s),
and throws `TemporalParseError` on failure — use them to convert columns at
authoring time instead of hand-rolled parsing.

```json complete
{
  "data": {
    "values": [
      { "day": "2026-01-05", "kwh": 12.1, "site": "north" },
      { "day": "2026-02-02", "kwh": 14.9, "site": "north" },
      { "day": "2026-01-05", "kwh": 13.4, "site": "south" },
      { "day": "2026-02-02", "kwh": 16.0, "site": "south" }
    ]
  },
  "aes": {
    "x": { "field": "day" },
    "y": { "field": "kwh" },
    "color": { "field": "site" }
  },
  "layers": [{ "geom": "line" }],
  "scales": {
    "x": { "type": "time", "dateBreaks": "1 month", "dateLabels": "%b %Y" },
    "color": { "type": "ordinal", "scheme": "Dark2" }
  }
}
```
