<script lang="ts">
  import {
    CoordFlip,
    GeomCol,
    GGPlot,
    Guides,
    Labs,
    Scale,
    Theme,
  } from "@ggsvelte/svelte";
  import type { CATEGORICAL_SCHEME_NAMES, ThemeName } from "@ggsvelte/spec";

  import { paletteSpecimenChart } from "$lib/theme-specimens/palette-bars";

  type CategoricalSchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

  const {
    name,
    label,
    capacity,
    reverse,
    paperTheme,
    height,
  }: {
    name: CategoricalSchemeName;
    label: string;
    capacity: number;
    reverse: boolean;
    paperTheme: ThemeName;
    height: number;
  } = $props();

  const chart = $derived(paletteSpecimenChart(capacity));
</script>

<GGPlot
  data={chart.rows}
  aes={{ x: "category", y: "value", fill: "category" }}
  inspect={{ mode: "exact" }}
  {height}
  ariaLabel={`${label} palette on ${paperTheme} paper`}
>
  <Theme name={paperTheme} />
  <Scale value={{ fill: { type: "ordinal", scheme: name, reverse } }} />
  <Guides value={{ fill: { type: "none" } }} />
  <Labs title={chart.title} x={chart.x} y={chart.y} />
  {#if chart.flip}
    <CoordFlip />
  {/if}
  <GeomCol width={0.75} />
</GGPlot>
