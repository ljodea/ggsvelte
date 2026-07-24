<script lang="ts">
  import {
    GeomArea,
    GeomBar,
    GeomCol,
    GeomLine,
    GeomPoint,
    GeomSmooth,
    GeomText,
    GGPlot,
    scaleXLog10,
  } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import type {
    SchemeName,
    ThemeSpecimenKind,
  } from "$lib/theme-specimens/catalog";
  import { MONTH_BREAKS } from "$lib/theme-specimens/catalog";
  import {
    attendees,
    cities,
    countries,
    generation,
    longRunSeries,
    penguins,
    revenue,
    ridership,
    temperaturesKeyed,
  } from "$lib/theme-specimens/data";

  const {
    name,
    label,
    caption,
    kind,
    scheme,
    legendFocus,
  }: {
    name: ThemeName;
    label: string;
    caption: string;
    kind: ThemeSpecimenKind;
    scheme: SchemeName;
    legendFocus: boolean;
  } = $props();

  const plotHeight = 380;
  const colorScale = $derived({ type: "ordinal" as const, scheme });
</script>

<article class="specimen">
  <header>
    <h3>{label}</h3>
    <p class="caption">{caption}</p>
  </header>

  <div class="plot-panel">
    {#if kind === "temps-line"}
      <GGPlot
        data={temperaturesKeyed}
        aes={{ x: "month", y: "temp", color: "city" }}
        theme={name}
        scales={{
          x: { breaks: [...MONTH_BREAKS] },
          color: colorScale,
        }}
        labs={{
          title: "Monthly mean temperature",
          x: "Month",
          y: "Temperature (°C)",
          color: "City",
        }}
        key="id"
        inspect={{ mode: "x" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme multi-series temperatures`}
      >
        <GeomLine linewidth={2} />
        <GeomPoint size={2.5} />
      </GGPlot>
    {:else if kind === "ridership-line"}
      <GGPlot
        data={ridership}
        aes={{ x: "month", y: "riders", color: "mode" }}
        theme={name}
        scales={{ color: colorScale }}
        labs={{
          title: "Daily transit ridership",
          x: "Month",
          y: "Daily riders (thousands)",
          color: "Mode",
        }}
        key="id"
        inspect={{ mode: "x" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme ridership series`}
      >
        <GeomLine linewidth={2} />
        <GeomPoint size={2.8} />
      </GGPlot>
    {:else if kind === "attendees-dodge"}
      <GGPlot
        data={attendees}
        aes={{ x: "track", fill: "level" }}
        theme={name}
        scales={{ fill: colorScale }}
        labs={{
          title: "Conference attendees by track and experience",
          x: "Track",
          y: "Attendees",
          fill: "Experience",
        }}
        key="id"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme dodged bars`}
      >
        <GeomBar position="dodge" />
      </GGPlot>
    {:else if kind === "generation-area"}
      <GGPlot
        data={generation}
        aes={{ x: "year", y: "twh", fill: "source" }}
        theme={name}
        scales={{
          x: { labels: "d", nice: false },
          fill: colorScale,
        }}
        labs={{
          title: "Electricity generation mix",
          x: "Year",
          y: "Generation (TWh)",
          fill: "Source",
        }}
        key="id"
        inspect={{ mode: "x" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme stacked generation`}
      >
        <GeomArea alpha={0.9} />
      </GGPlot>
    {:else if kind === "long-run-line"}
      <GGPlot
        data={longRunSeries}
        aes={{ x: "year", y: "value" }}
        theme={name}
        labs={{
          title: "Long-run index, 1835–2025",
          x: "Year",
          y: "Index",
        }}
        inspect={{ mode: "x" }}
        height={plotHeight}
        ariaLabel={`${label} theme long-run series`}
      >
        <GeomLine linewidth={1.5} />
      </GGPlot>
    {:else if kind === "penguins-scatter"}
      <GGPlot
        data={penguins}
        aes={{ x: "flipper", y: "mass", color: "species" }}
        theme={name}
        scales={{ color: colorScale }}
        labs={{
          title: "Penguin flipper length and body mass",
          x: "Flipper length (mm)",
          y: "Body mass (g)",
          color: "Species",
        }}
        key="id"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme penguin scatter`}
      >
        <GeomPoint size={3.5} alpha={0.9} />
      </GGPlot>
    {:else if kind === "countries-scatter"}
      <GGPlot
        data={countries}
        aes={{ x: "gdp", y: "lifeExp", color: "region" }}
        theme={name}
        scales={{
          ...scaleXLog10({ labels: "~s" }),
          color: colorScale,
        }}
        labs={{
          title: "Income and life expectancy",
          x: "GDP per capita (USD, log scale)",
          y: "Life expectancy (years)",
          color: "Region",
        }}
        key="country"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme income scatter`}
      >
        <GeomPoint size={3.5} />
        <GeomSmooth method="lm" se={false} />
      </GGPlot>
    {:else if kind === "revenue-cols"}
      <GGPlot
        data={revenue}
        aes={{ x: "quarter", y: "amount" }}
        theme={name}
        labs={{
          title: "Quarterly revenue",
          x: "Quarter",
          y: "Revenue (€ thousands)",
        }}
        inspect={{ mode: "xy" }}
        height={plotHeight}
        ariaLabel={`${label} theme revenue columns`}
      >
        <GeomCol width={0.7} />
        <GeomText aes={{ label: "label" }} dy={-8} size={11} />
      </GGPlot>
    {:else}
      <GGPlot
        data={cities}
        aes={{ x: "rent", y: "livability" }}
        theme={name}
        scales={{ x: { labels: ",d" } }}
        labs={{
          title: "Livability vs median rent",
          x: "Median monthly rent (USD)",
          y: "Livability index",
        }}
        inspect={{ mode: "xy" }}
        height={plotHeight}
        ariaLabel={`${label} theme labeled cities`}
      >
        <GeomPoint size={3} />
        <GeomText aes={{ label: "city" }} dy={-9} size={10} />
      </GGPlot>
    {/if}
  </div>
</article>

<style>
  .specimen {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  header {
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  .caption {
    margin: 0.25rem 0 0;
    max-width: 40rem;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }
</style>
