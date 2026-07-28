<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorDiscrete,
    ScaleXContinuous,
    Theme,
  } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import type { SchemeName } from "$lib/theme-specimens/catalog";
  import { temperaturesKeyed } from "$lib/theme-specimens/data";
  import { TEMPERATURES_CHART } from "$lib/theme-specimens/temperatures-chart";

  const {
    theme,
    scheme,
    height,
    legendFocus,
    ariaLabel,
  }: {
    theme: ThemeName;
    scheme: SchemeName;
    height: number;
    legendFocus: boolean;
    ariaLabel: string;
  } = $props();

  const chart = TEMPERATURES_CHART;
</script>

<GGPlot
  data={temperaturesKeyed}
  aes={chart.aes}
  key={chart.key}
  inspect={chart.inspect}
  {legendFocus}
  {height}
  {ariaLabel}
>
  <Theme name={theme} />
  <ScaleXContinuous breaks={[...chart.monthBreaks]} />
  <ScaleColorDiscrete {scheme} />
  <Labs
    title={chart.labs.title}
    x={chart.labs.x}
    y={chart.labs.y}
    color={chart.labs.color}
  />
  <GeomLine linewidth={chart.geomLine.linewidth} />
  <GeomPoint size={chart.geomPoint.size} />
</GGPlot>
