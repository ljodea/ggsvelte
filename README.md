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
    scaleSizeContinuous,
  } from "@ggsvelte/svelte";

  import { gammaVirginis } from "./data.js";
</script>

<GGPlot
  data={gammaVirginis}
  aes={{ x: "year", y: "angle" }}
  theme="tufte"
  scales={{ x: { labels: "d" }, ...scaleSizeContinuous({ range: [3, 8] }) }}
  labs={{
    title: "The first scatterplot, redrawn",
    subtitle:
      "Herschel plotted γ Virginis in 1833 and fitted the curve by hand",
    x: "Year",
    y: "Position angle (°)",
    size: "Herschel's weight",
  }}
  width={640}
  height={400}
>
  <GeomSmooth method="loess" span={0.75} />
  <GeomPoint aes={{ size: "weight" }} alpha={0.85} />
</GGPlot>
```

[![The position angle of gamma Virginis from 1718 to 1830 with a loess trend and confidence ribbon](apps/docs/static/previews/smooth-loess-scatter-light.png)](https://ggsvelte.sh/examples/smooth/loess-scatter)

### [Stacked area](https://ggsvelte.sh/examples/area/stacked)

<!-- example-source: area/stacked -->

```svelte
<script lang="ts">
  import { GeomArea, GGPlot } from "@ggsvelte/svelte";

  import { crimeanMortality } from "./data.js";
</script>

<GGPlot
  data={crimeanMortality}
  aes={{ x: "month", y: "deaths", fill: "cause" }}
  theme="economist"
  scales={{
    x: { labels: "%b %Y" },
    fill: {
      type: "manual",
      domain: ["Disease", "Wounds", "Other"],
      range: ["#d14d41", "#014d64", "#4385be"],
    },
  }}
  labs={{
    title: "Deaths in the Crimea, 1854–56",
    subtitle: "Annual rate per 1,000 — disease dwarfs combat, then collapses",
    x: "Month",
    y: "Deaths per 1,000 per year",
    fill: "Cause",
  }}
  width={640}
  height={400}
>
  <GeomArea alpha={0.9} />
</GGPlot>
```

[![Crimean War deaths by cause as a stacked area chart](apps/docs/static/previews/area-stacked-light.png)](https://ggsvelte.sh/examples/area/stacked)

### [Density estimates](https://ggsvelte.sh/examples/density/overlay)

<!-- example-source: density/overlay -->

```svelte
<script lang="ts">
  import { GeomDensity, GGPlot } from "@ggsvelte/svelte";

  import { galtonChildren } from "./data.js";
</script>

<GGPlot
  data={galtonChildren}
  aes={{ x: "height", fill: "gender" }}
  theme="minimal"
  scales={{
    fill: {
      type: "manual",
      domain: ["Daughters", "Sons"],
      range: ["#8b7ec8", "#3aa99f"],
    },
  }}
  labs={{
    title: "Heights of Galton's 934 adult children",
    subtitle: "Two overlapping distributions, separated at the means",
    x: "Height (inches)",
    y: "Density",
    fill: "Child",
  }}
  width={640}
  height={400}
>
  <GeomDensity alpha={0.45} />
</GGPlot>
```

[![Heights of Galton's adult children as overlaid density estimates](apps/docs/static/previews/density-overlay-light.png)](https://ggsvelte.sh/examples/density/overlay)

### [Log scale, fit, and inspection](https://ggsvelte.sh/examples/point/log-scale)

<!-- example-source: point/log-scale -->

```svelte
<script lang="ts">
  import { GeomPoint, GGPlot, scaleXLog10 } from "@ggsvelte/svelte";

  import { londonCholera } from "./data.js";
</script>

<GGPlot
  data={londonCholera}
  aes={{ x: "density", y: "deathRate", color: "water" }}
  theme="economist"
  scales={{
    ...scaleXLog10({ labels: "~s" }),
    color: {
      type: "manual",
      domain: ["Battersea", "New River", "Kew"],
      range: ["#d14d41", "#014d64", "#4385be"],
    },
  }}
  key="district"
  inspect={{ mode: "xy", pin: true }}
  labs={{
    title: "Cholera, crowding and water in London, 1849",
    subtitle: "Death rate against population density, by water company",
    x: "People per acre (log scale)",
    y: "Cholera deaths per 10,000",
    color: "Water supply",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={3.5} />
</GGPlot>
```

[![London cholera death rates against population density on a log scale](apps/docs/static/previews/point-log-scale-light.png)](https://ggsvelte.sh/examples/point/log-scale)

### [Faceted histograms](https://ggsvelte.sh/examples/facet/wrap)

<!-- example-source: facet/wrap -->

```svelte
<script lang="ts">
  import { GeomHistogram, GGPlot } from "@ggsvelte/svelte";

  import { familyHeights } from "./data.js";
</script>

<GGPlot
  data={familyHeights}
  aes={{ x: "child", weight: "n" }}
  theme="ggplot2"
  facet={{ wrap: "pair", ncol: 2 }}
  labs={{
    title: "4,892 English children, measured by Pearson and Lee",
    subtitle:
      "Sons stand four and a half inches taller; the two daughter panels are the same girls, tabulated against each parent",
    x: "Child's height (inches)",
    y: "Children",
  }}
  width={640}
  height={400}
>
  <GeomHistogram bins={18} />
</GGPlot>
```

[![Child-height histograms faceted by the four parent-child pairings Pearson and Lee tabulated](apps/docs/static/previews/facet-wrap-light.png)](https://ggsvelte.sh/examples/facet/wrap)

### [Proportional bars](https://ggsvelte.sh/examples/bar/proportions)

<!-- example-source: bar/proportions -->

```svelte
<script lang="ts">
  import { GeomBar, GGPlot } from "@ggsvelte/svelte";

  import { armadaCrews } from "./data.js";
</script>

<GGPlot
  data={armadaCrews}
  aes={{ x: "squadron", fill: "role", weight: "men" }}
  theme="fivethirtyeight"
  scales={{
    y: { labels: ".0%" },
    fill: {
      type: "manual",
      domain: ["Soldiers", "Sailors"],
      range: ["#c14a3d", "#3c6e8f"],
    },
  }}
  labs={{
    title: "Who sailed with the Armada, 1588",
    subtitle:
      "Soldiers outnumber sailors everywhere except the galleys and the light pataches",
    x: "Squadron",
    y: "Share of complement",
    fill: "Role",
  }}
  width={640}
  height={400}
>
  <GeomBar position="fill" />
</GGPlot>
```

[![Spanish Armada squadron complements shown as proportional bars](apps/docs/static/previews/bar-proportions-light.png)](https://ggsvelte.sh/examples/bar/proportions)

### [Continuous color](https://ggsvelte.sh/examples/color/continuous)

<!-- example-source: color/continuous -->

```svelte
<script lang="ts">
  import { GeomPoint, GGPlot, scaleColorContinuous } from "@ggsvelte/svelte";

  import { stations } from "./data.js";
</script>

<GGPlot
  data={stations}
  aes={{ x: "elevation", y: "julyTemp", color: "elevation" }}
  scales={scaleColorContinuous({ scheme: "viridis" })}
  labs={{
    title: "It gets colder as you climb",
    x: "Elevation (m)",
    y: "July mean temperature (°C)",
    color: "Elevation (m)",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={4} />
</GGPlot>
```

[![Temperature and elevation with a continuous viridis color scale](apps/docs/static/previews/color-continuous-light.png)](https://ggsvelte.sh/examples/color/continuous)

Guide presentation stays separate from scale math. Use `guides={{ color:
guideColorbar({ position: "bottom" }) }}` (or fluent `.guides()`) to title,
orient, place, suppress, or force axes and non-position guides. Automatic legends use
the right side only while at least 320px of panel remains, then move below with
complete accessible labels and unchanged scale assignments.

### [Boxplots](https://ggsvelte.sh/examples/boxplot/by-category)

<!-- example-source: boxplot/by-category -->

```svelte
<script lang="ts">
  import { GeomBoxplot, GGPlot } from "@ggsvelte/svelte";

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "run", y: "velocity" }}
  theme="few"
  scales={{ x: { domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"] } }}
  labs={{
    title: "Michelson's five runs, 1879",
    subtitle:
      "Twenty measurements each — the runs disagree more than the readings within them",
    x: "Run",
    y: "Velocity (km/s − 299,000)",
  }}
  width={640}
  height={400}
>
  <GeomBoxplot />
</GGPlot>
```

[![Michelson's five speed-of-light runs summarized as boxplots](apps/docs/static/previews/boxplot-by-category-light.png)](https://ggsvelte.sh/examples/boxplot/by-category)

### [Calendar time from raw years](https://ggsvelte.sh/examples/line/time-axis)

<!-- example-source: line/time-axis -->

```svelte
<script lang="ts">
  import { GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { britishExports } from "./data.js";
</script>

<GGPlot
  data={britishExports}
  aes={{ x: "year", y: "value" }}
  theme="fivethirtyeight"
  labs={{
    title: "British and Irish exports, 1855–1899",
    subtitle: "Raw four-digit strings infer a calendar scale",
    x: "Year",
    y: "£ millions",
  }}
  width="container"
  height={400}
>
  <GeomLine linewidth={1.5} />
</GGPlot>
```

[![British and Irish exports plotted on an inferred calendar scale](apps/docs/static/previews/line-time-axis-light.png)](https://ggsvelte.sh/examples/line/time-axis)

### [Layered value labels](https://ggsvelte.sh/examples/col/value-labels)

<!-- example-source: col/value-labels -->

```svelte
<script lang="ts">
  import { GeomCol, GeomText, GGPlot } from "@ggsvelte/svelte";

  import { polioTrial } from "./data.js";
</script>

<GGPlot
  data={polioTrial}
  aes={{ x: "group", y: "rate" }}
  theme="fivethirtyeight"
  scales={{ x: { domain: ["Vaccinated", "Placebo", "Not inoculated"] } }}
  labs={{
    title: "The Salk vaccine field trial, 1954",
    subtitle: "Paralytic polio per 100,000 children in the randomised arm",
    x: "Group",
    y: "Cases per 100,000",
  }}
  width={640}
  height={400}
>
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
