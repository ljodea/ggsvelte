# ggsvelte

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg)](https://app.codecov.io/gh/ljodea/ggsvelte)

A layered grammar of graphics for Svelte 5. Map data to aesthetics, add geoms, then
compose statistics, scales, facets, coordinates, themes, and interaction.

[Documentation](https://ggsvelte.sh/) · [Examples](https://ggsvelte.sh/examples) ·
[Getting started](https://ggsvelte.sh/guide/getting-started) ·
[Playground](https://ggsvelte.sh/playground)

## Install

```sh
bun add @ggsvelte/svelte
# or: npm install @ggsvelte/svelte
```

Requires Node.js 22+ and Svelte 5.33.1+. npm, pnpm, and Bun installs are tested on
Ubuntu and Windows.

## Examples

Each image is generated from the Svelte file shown above it. Open a chart for the
live output and complete source.

### [Loess trend with uncertainty](https://ggsvelte.sh/examples/smooth/loess-scatter)

<!-- example-source: smooth/loess-scatter -->

```svelte
<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    Labs,
    ScaleSizeContinuous,
    ScaleXContinuous,
    ThemeTufte,
  } from "@ggsvelte/svelte";

  import { gammaVirginis } from "./data.js";
</script>

<GGPlot
  data={gammaVirginis}
  aes={{ x: "year", y: "angle" }}
  width={640}
  height={400}
>
  <ThemeTufte />
  <ScaleXContinuous labels="d" />
  <ScaleSizeContinuous range={[3, 8]} />
  <Labs
    title="The first scatterplot, redrawn"
    subtitle="Herschel plotted γ Virginis in 1833 and fitted the curve by hand"
    x="Year"
    y="Position angle (°)"
    size="Herschel's weight"
  />
  <GeomSmooth method="loess" span={0.75} />
  <GeomPoint aes={{ size: "weight" }} alpha={0.85} />
</GGPlot>
```

[![The position angle of gamma Virginis from 1718 to 1830 with a loess trend and confidence ribbon](apps/docs/static/previews/smooth-loess-scatter-light.png)](https://ggsvelte.sh/examples/smooth/loess-scatter)

### [Stacked area](https://ggsvelte.sh/examples/area/stacked)

<!-- example-source: area/stacked -->

```svelte
<script lang="ts">
  import {
    GeomArea,
    GGPlot,
    Labs,
    ScaleFillManual,
    ScaleXDate,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { crimeanMortality } from "./data.js";
</script>

<GGPlot
  data={crimeanMortality}
  aes={{ x: "month", y: "deaths", fill: "cause" }}
  width={640}
  height={400}
>
  <ThemeEconomist />
  <ScaleXDate labels="%b %Y" />
  <ScaleFillManual
    domain={["Disease", "Wounds", "Other"]}
    values={["#d14d41", "#014d64", "#4385be"]}
  />
  <Labs
    title="Deaths in the Crimea, 1854–56"
    subtitle="Annual rate per 1,000 — disease dwarfs combat, then collapses"
    x="Month"
    y="Deaths per 1,000 per year"
    fill="Cause"
  />
  <GeomArea alpha={0.9} />
</GGPlot>
```

[![Crimean War deaths by cause as a stacked area chart](apps/docs/static/previews/area-stacked-light.png)](https://ggsvelte.sh/examples/area/stacked)

### [Density estimates](https://ggsvelte.sh/examples/density/overlay)

<!-- example-source: density/overlay -->

```svelte
<script lang="ts">
  import {
    GeomDensity,
    GGPlot,
    Labs,
    ScaleFillManual,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { galtonChildren } from "./data.js";
</script>

<GGPlot
  data={galtonChildren}
  aes={{ x: "height", fill: "gender" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleFillManual
    domain={["Daughters", "Sons"]}
    values={["#8b7ec8", "#3aa99f"]}
  />
  <Labs
    title="Heights of Galton's 934 adult children"
    subtitle="Two overlapping distributions, separated at the means"
    x="Height (inches)"
    y="Density"
    fill="Child"
  />
  <GeomDensity alpha={0.45} />
</GGPlot>
```

[![Heights of Galton's adult children as overlaid density estimates](apps/docs/static/previews/density-overlay-light.png)](https://ggsvelte.sh/examples/density/overlay)

### [Log scale, fit, and inspection](https://ggsvelte.sh/examples/point/log-scale)

<!-- example-source: point/log-scale -->

```svelte
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ScaleXLog10,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { londonCholera } from "./data.js";
</script>

<GGPlot
  data={londonCholera}
  aes={{ x: "density", y: "deathRate", color: "water" }}
  key="district"
  inspect={{ mode: "xy", pin: true }}
  width="container"
  height={400}
>
  <ThemeEconomist />
  <ScaleXLog10 labels="~s" />
  <ScaleColorManual
    domain={["Battersea", "New River", "Kew"]}
    values={["#d14d41", "#014d64", "#4385be"]}
  />
  <Labs
    title="Cholera, crowding and water in London, 1849"
    subtitle="Death rate against population density, by water company"
    x="People per acre (log scale)"
    y="Cholera deaths per 10,000"
    color="Water supply"
  />
  <GeomPoint size={3.5} />
</GGPlot>
```

[![London cholera death rates against population density on a log scale](apps/docs/static/previews/point-log-scale-light.png)](https://ggsvelte.sh/examples/point/log-scale)

### [Faceted histograms](https://ggsvelte.sh/examples/facet/wrap)

<!-- example-source: facet/wrap -->

```svelte
<script lang="ts">
  import {
    FacetWrap,
    GeomHistogram,
    GGPlot,
    Labs,
    ThemeGgplot2,
  } from "@ggsvelte/svelte";

  import { familyHeights } from "./data.js";
</script>

<GGPlot
  data={familyHeights}
  aes={{ x: "child", weight: "n" }}
  width={640}
  height={400}
>
  <ThemeGgplot2 />
  <FacetWrap field="pair" ncol={2} />
  <Labs
    title="4,892 English children, measured by Pearson and Lee"
    subtitle="Sons stand four and a half inches taller; the two daughter panels are the same girls, tabulated against each parent"
    x="Child's height (inches)"
    y="Children"
  />
  <GeomHistogram bins={18} />
</GGPlot>
```

[![Child-height histograms faceted by the four parent-child pairings Pearson and Lee tabulated](apps/docs/static/previews/facet-wrap-light.png)](https://ggsvelte.sh/examples/facet/wrap)

### [Proportional bars](https://ggsvelte.sh/examples/bar/proportions)

<!-- example-source: bar/proportions -->

```svelte
<script lang="ts">
  import {
    GeomBar,
    GGPlot,
    Labs,
    ScaleFillManual,
    ScaleYContinuous,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { armadaCrews } from "./data.js";
</script>

<GGPlot
  data={armadaCrews}
  aes={{ x: "squadron", fill: "role", weight: "men" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <ScaleYContinuous labels=".0%" />
  <ScaleFillManual
    domain={["Soldiers", "Sailors"]}
    values={["#c14a3d", "#3c6e8f"]}
  />
  <Labs
    title="Who sailed with the Armada, 1588"
    subtitle="Soldiers outnumber sailors everywhere except the galleys and the light pataches"
    x="Squadron"
    y="Share of complement"
    fill="Role"
  />
  <GeomBar position="fill" />
</GGPlot>
```

[![Spanish Armada squadron complements shown as proportional bars](apps/docs/static/previews/bar-proportions-light.png)](https://ggsvelte.sh/examples/bar/proportions)

### [Continuous color](https://ggsvelte.sh/examples/color/continuous)

<!-- example-source: color/continuous -->

```svelte
<script lang="ts">
  import {
    CoordFixed,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorContinuous,
    ThemeDark,
  } from "@ggsvelte/svelte";

  import { greatLakesSurveys, greatLakesTruth } from "./data.js";
</script>

<GGPlot
  data={greatLakesSurveys}
  aes={{ x: "long", y: "lat", color: "year" }}
  width={640}
  height={400}
>
  <ThemeDark />
  <CoordFixed />
  <ScaleColorContinuous scheme="viridis" labels="d" />
  <Labs
    title="Eleven maps of the Great Lakes, 1688–1818"
    subtitle="White crosses are the 39 true positions; each dot is one map's attempt at one of them"
    x="Longitude (°)"
    y="Latitude (°)"
    color="Map year"
  />
  <GeomPoint size={2.6} alpha={0.75} />
  <GeomPoint
    data={greatLakesTruth}
    aes={{ x: "long", y: "lat", color: { value: "#ffffff" } }}
    size={3.4}
    shape="cross"
  />
</GGPlot>
```

[![Eleven old maps of the Great Lakes coloured by publication year against the true positions](apps/docs/static/previews/color-continuous-light.png)](https://ggsvelte.sh/examples/color/continuous)

Guide presentation stays separate from scale math. Use
`<GuideColorbar channel="color" position="bottom" />` (or
`<GuideLegend channel="color" position="bottom" />`, `<GuideNone channel="size" />`)
to title, orient, place, suppress, or force axes and non-position guides. Automatic
legends use the right side only while at least 320px of panel remains, then move below
with complete accessible labels and unchanged scale assignments.

### [Boxplots](https://ggsvelte.sh/examples/boxplot/by-category)

<!-- example-source: boxplot/by-category -->

```svelte
<script lang="ts">
  import {
    GeomBoxplot,
    GGPlot,
    Labs,
    ScaleXDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "run", y: "velocity" }}
  width={640}
  height={400}
>
  <ThemeFew />
  <ScaleXDiscrete domain={["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"]} />
  <Labs
    title="Michelson's five runs, 1879"
    subtitle="Twenty measurements each — the runs disagree more than the readings within them"
    x="Run"
    y="Velocity (km/s − 299,000)"
  />
  <GeomBoxplot />
</GGPlot>
```

[![Michelson's five speed-of-light runs summarized as boxplots](apps/docs/static/previews/boxplot-by-category-light.png)](https://ggsvelte.sh/examples/boxplot/by-category)

### [Calendar time from raw years](https://ggsvelte.sh/examples/line/time-axis)

<!-- example-source: line/time-axis -->

```svelte
<script lang="ts">
  import {
    GeomLine,
    GGPlot,
    Labs,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { britishExports } from "./data.js";
</script>

<GGPlot
  data={britishExports}
  aes={{ x: "year", y: "value" }}
  width="container"
  height={400}
>
  <ThemeFivethirtyeight />
  <Labs
    title="British and Irish exports, 1855–1899"
    subtitle="Raw four-digit strings infer a calendar scale"
    x="Year"
    y="£ millions"
  />
  <GeomLine linewidth={1.5} />
</GGPlot>
```

[![British and Irish exports plotted on an inferred calendar scale](apps/docs/static/previews/line-time-axis-light.png)](https://ggsvelte.sh/examples/line/time-axis)

### [Layered value labels](https://ggsvelte.sh/examples/col/value-labels)

<!-- example-source: col/value-labels -->

```svelte
<script lang="ts">
  import {
    GeomCol,
    GeomText,
    GGPlot,
    Labs,
    ScaleXDiscrete,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { polioTrial } from "./data.js";
</script>

<GGPlot
  data={polioTrial}
  aes={{ x: "group", y: "rate" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <ScaleXDiscrete domain={["Vaccinated", "Placebo", "Not inoculated"]} />
  <Labs
    title="The Salk vaccine field trial, 1954"
    subtitle="Paralytic polio per 100,000 children in the randomised arm"
    x="Group"
    y="Cases per 100,000"
  />
  <GeomCol width={0.7} />
  <GeomText aes={{ label: "label" }} dy={-8} />
</GGPlot>
```

[![Salk vaccine trial polio rates with a text layer for value labels](apps/docs/static/previews/col-value-labels-light.png)](https://ggsvelte.sh/examples/col/value-labels)

## Themes

Chart themes are independent of the site's light or dark appearance. The same spec can
use a built-in theme or explicit theme tokens.

|                                                           Tufte                                                           |                                                             Economist                                                             |
| :-----------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------: |
| [![Multi-series chart using the Tufte theme](artifacts/theme-equivalence/ggsvelte-tufte.png)](https://ggsvelte.sh/themes) | [![Multi-series chart using the Economist theme](artifacts/theme-equivalence/ggsvelte-economist.png)](https://ggsvelte.sh/themes) |
|                                                           HRBR                                                            |                                                               Dark                                                                |
|  [![Multi-series chart using the HRBR theme](artifacts/theme-equivalence/ggsvelte-hrbr.png)](https://ggsvelte.sh/themes)  |      [![Multi-series chart using the dark theme](artifacts/theme-equivalence/ggsvelte-dark.png)](https://ggsvelte.sh/themes)      |

[Compare every theme and palette](https://ggsvelte.sh/themes).

## Composition

- Geoms share one layer model, so points, lines, intervals, summaries, annotations,
  and text can occupy the same plot.
- Statistics and positions include binning, density, loess and linear fits, stacking,
  filling, dodging, and seeded jitter.
- Scales cover continuous, discrete, temporal, binned, transformed, color/fill, size, linewidth, alpha, shape, and linetype data.
- Facets train fixed or free panel scales; coordinates can flip axes, project final geometry after statistics, or preserve exact physical data-unit ratios with `coordFixed()`.
- Inspection, selection, zoom, and legend controls emit semantic Svelte events.
- Ordinary layers render as SVG. Dense point layers move to canvas while axes, text,
  legends, and accessible descriptions remain in the DOM.

## Packages

| Package                               | Surface                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| [`@ggsvelte/svelte`](packages/svelte) | Svelte 5 components, package re-exports, and the CLI                    |
| [`@ggsvelte/spec`](packages/spec)     | Portable types, JSON Schema, validation, normalization, and the builder |
| [`@ggsvelte/core`](packages/core)     | Framework-independent pipeline, SVG renderer, canvas, and hit testing   |

Most applications need only `@ggsvelte/svelte`.

## Reference

- [Guide](https://ggsvelte.sh/docs)
- [Example gallery](https://ggsvelte.sh/examples)
- [Themes and palettes](https://ggsvelte.sh/themes)
- [Interactions and events](https://ggsvelte.sh/reference/interactions)
- [Compatibility](https://ggsvelte.sh/guide/compatibility)
- [Upgrading](https://ggsvelte.sh/guide/upgrading)

Machine-readable documentation is available at
[`llms.txt`](https://ggsvelte.sh/llms.txt),
[`llms-full.txt`](https://ggsvelte.sh/llms-full.txt), and
[`schema/v0.json`](https://ggsvelte.sh/schema/v0.json).

## Release status

ggsvelte remains pre-1.0. Package manifests are the version source of truth. Lifecycle
and compatibility contracts are documented in
[`lifecycle.json`](lifecycle.json) and the
[lifecycle guide](https://ggsvelte.sh/guide/lifecycle).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Liam O'Dea. Loess reference implementation attribution is recorded in
[NOTICE](NOTICE).
