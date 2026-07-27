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
    Labs,
    Scale,
    scaleXLog10,
    Theme,
  } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import TemperaturesSpecimen from "$lib/components/TemperaturesSpecimen.svelte";
  import type {
    SchemeName,
    ThemeSpecimenKind,
  } from "$lib/theme-specimens/catalog";
  import {
    attendees,
    cities,
    countries,
    generation,
    longRunSeries,
    penguins,
    revenue,
    ridership,
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
      <TemperaturesSpecimen
        theme={name}
        {scheme}
        height={plotHeight}
        {legendFocus}
        ariaLabel={`${label} theme multi-series temperatures`}
      />
    {:else if kind === "ridership-line"}
      <GGPlot
        data={ridership}
        aes={{ x: "month", y: "riders", color: "mode" }}
        key="id"
        inspect={{ mode: "x" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme ridership series`}
      >
        <Theme {name} />
        <Scale value={{ color: colorScale }} />
        <Labs
          title="Daily transit ridership"
          x="Month"
          y="Daily riders (thousands)"
          color="Mode"
        />
        <GeomLine linewidth={2} />
        <GeomPoint size={2.8} />
      </GGPlot>
    {:else if kind === "attendees-dodge"}
      <GGPlot
        data={attendees}
        aes={{ x: "track", fill: "level" }}
        key="id"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme dodged bars`}
      >
        <Theme {name} />
        <Scale value={{ fill: colorScale }} />
        <Labs
          title="Conference attendees by track and experience"
          x="Track"
          y="Attendees"
          fill="Experience"
        />
        <GeomBar position="dodge" />
      </GGPlot>
    {:else if kind === "generation-area"}
      <GGPlot
        data={generation}
        aes={{ x: "year", y: "twh", fill: "source" }}
        key="id"
        inspect={{ mode: "x" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme stacked generation`}
      >
        <Theme {name} />
        <Scale
          value={{
            x: { labels: "d", nice: false },
            fill: colorScale,
          }}
        />
        <Labs
          title="Electricity generation mix"
          x="Year"
          y="Generation (TWh)"
          fill="Source"
        />
        <GeomArea alpha={0.9} />
      </GGPlot>
    {:else if kind === "long-run-line"}
      <GGPlot
        data={longRunSeries}
        aes={{ x: "year", y: "value" }}
        inspect={{ mode: "x" }}
        height={plotHeight}
        ariaLabel={`${label} theme long-run series`}
      >
        <Theme {name} />
        <Labs title="Long-run index, 1835–2025" x="Year" y="Index" />
        <GeomLine linewidth={1.5} />
      </GGPlot>
    {:else if kind === "penguins-scatter"}
      <GGPlot
        data={penguins}
        aes={{ x: "flipper", y: "mass", color: "species" }}
        key="id"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme penguin scatter`}
      >
        <Theme {name} />
        <Scale value={{ color: colorScale }} />
        <Labs
          title="Penguin flipper length and body mass"
          x="Flipper length (mm)"
          y="Body mass (g)"
          color="Species"
        />
        <GeomPoint size={3.5} alpha={0.9} />
      </GGPlot>
    {:else if kind === "countries-scatter"}
      <GGPlot
        data={countries}
        aes={{ x: "gdp", y: "lifeExp", color: "region" }}
        key="country"
        inspect={{ mode: "xy" }}
        {legendFocus}
        height={plotHeight}
        ariaLabel={`${label} theme income scatter`}
      >
        <Theme {name} />
        <Scale
          value={{
            ...scaleXLog10({ labels: "~s" }),
            color: colorScale,
          }}
        />
        <Labs
          title="Income and life expectancy"
          x="GDP per capita (USD, log scale)"
          y="Life expectancy (years)"
          color="Region"
        />
        <GeomPoint size={3.5} />
        <GeomSmooth method="lm" se={false} />
      </GGPlot>
    {:else if kind === "revenue-cols"}
      <GGPlot
        data={revenue}
        aes={{ x: "quarter", y: "amount" }}
        inspect={{ mode: "xy" }}
        height={plotHeight}
        ariaLabel={`${label} theme revenue columns`}
      >
        <Theme {name} />
        <Labs title="Quarterly revenue" x="Quarter" y="Revenue (€ thousands)" />
        <GeomCol width={0.7} />
        <GeomText aes={{ label: "label" }} dy={-8} size={11} />
      </GGPlot>
    {:else}
      <GGPlot
        data={cities}
        aes={{ x: "rent", y: "livability" }}
        inspect={{ mode: "xy" }}
        height={plotHeight}
        ariaLabel={`${label} theme labeled cities`}
      >
        <Theme {name} />
        <Scale value={{ x: { labels: ",d" } }} />
        <Labs
          title="Livability vs median rent"
          x="Median monthly rent (USD)"
          y="Livability index"
        />
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
