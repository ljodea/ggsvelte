<script lang="ts">
  /**
   * Interactive body for a theme specimen. Dynamically imported by
   * ThemeSpecimen when the host is near the viewport so /themes does not
   * hydrate dozens of full GGPlot controllers on first paint.
   */
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
    kind,
    scheme,
    legendFocus,
    height,
  }: {
    name: ThemeName;
    label: string;
    kind: ThemeSpecimenKind;
    scheme: SchemeName;
    legendFocus: boolean;
    height: number;
  } = $props();

  const colorScale = $derived({ type: "ordinal" as const, scheme });
</script>

{#if kind === "temps-line"}
  <TemperaturesSpecimen
    theme={name}
    {scheme}
    {height}
    {legendFocus}
    ariaLabel={`${label} theme Playfair multi-series`}
  />
{:else if kind === "ridership-line"}
  <GGPlot
    data={ridership}
    aes={{ x: "month", y: "riders", color: "mode" }}
    key="id"
    inspect={{ mode: "x" }}
    {legendFocus}
    {height}
    ariaLabel={`${label} theme Playfair wheat and wages`}
  >
    <Theme {name} />
    <Scale value={{ color: colorScale }} />
    <Labs
      title="Playfair wheat price & weekly wage"
      x="Year"
      y="Shillings"
      color="Series"
    />
    <GeomLine linewidth={2} />
    <GeomPoint size={2.8} />
  </GGPlot>
{:else if kind === "attendees-dodge"}
  <GGPlot
    data={attendees}
    aes={{ x: "track", fill: "level", weight: "deaths" }}
    key="id"
    inspect={{ mode: "exact" }}
    {legendFocus}
    {height}
    ariaLabel={`${label} theme Edgeworth dodged bars`}
  >
    <Theme {name} />
    <Scale value={{ fill: colorScale }} />
    <Labs
      title="Edgeworth county deaths, 1876–82"
      x="Year"
      y="Deaths per million"
      fill="County"
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
    {height}
    ariaLabel={`${label} theme Nightingale stacked area`}
  >
    <Theme {name} />
    <Scale
      value={{
        x: { nice: false },
        fill: colorScale,
      }}
    />
    <Labs
      title="Crimean deaths by cause, 1854–56"
      x="Year"
      y="Deaths per 1,000 per year"
      fill="Cause"
    />
    <GeomArea alpha={0.9} />
  </GGPlot>
{:else if kind === "long-run-line"}
  <GGPlot
    data={longRunSeries}
    aes={{ x: "year", y: "value" }}
    inspect={{ mode: "x" }}
    {height}
    ariaLabel={`${label} theme Bowley exports`}
  >
    <Theme {name} />
    <Labs title="British exports, 1855–1899" x="Year" y="£ millions" />
    <GeomLine linewidth={1.5} />
  </GGPlot>
{:else if kind === "penguins-scatter"}
  <GGPlot
    data={penguins}
    aes={{ x: "flipper", y: "mass", color: "species" }}
    key="id"
    inspect={{ mode: "xy" }}
    {legendFocus}
    {height}
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
    {height}
    ariaLabel={`${label} theme cholera density scatter`}
  >
    <Theme {name} />
    <Scale
      value={{
        ...scaleXLog10({ labels: "~s" }),
        color: colorScale,
      }}
    />
    <Labs
      title="Cholera death rate vs density, 1849"
      x="People per acre (log scale)"
      y="Death rate per 10,000"
      color="Water supply"
    />
    <GeomPoint size={3.5} />
    <GeomSmooth method="lm" se={false} />
  </GGPlot>
{:else if kind === "revenue-cols"}
  <GGPlot
    data={revenue}
    aes={{ x: "quarter", y: "amount" }}
    inspect={{ mode: "exact" }}
    {height}
    ariaLabel={`${label} theme Salk trial columns`}
  >
    <Theme {name} />
    <Labs
      title="Salk trial paralytic polio rates"
      x="Group"
      y="Cases per 100,000"
    />
    <GeomCol width={0.7} />
    <GeomText aes={{ label: "label" }} dy={-8} size={11} />
  </GGPlot>
{:else}
  <GGPlot
    data={cities}
    aes={{ x: "rent", y: "livability" }}
    inspect={{ mode: "xy" }}
    {height}
    ariaLabel={`${label} theme Langren longitude labels`}
  >
    <Theme {name} />
    <Scale value={{ x: { labels: ".1f" } }} />
    <Labs
      title="Van Langren longitude estimates, 1644"
      x="Toledo–Rome longitude (°)"
      y="Estimate rank"
    />
    <GeomPoint size={3} />
    <GeomText aes={{ label: "city" }} dy={-9} size={10} />
  </GGPlot>
{/if}
