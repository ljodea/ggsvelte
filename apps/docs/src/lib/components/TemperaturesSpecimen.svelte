<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    Scale,
    Theme,
  } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

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
    scheme: string;
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
  <Scale
    value={{
      x: { breaks: [...chart.monthBreaks] },
      color: { type: "ordinal", scheme },
    }}
  />
  <Labs
    title={chart.labs.title}
    x={chart.labs.x}
    y={chart.labs.y}
    color={chart.labs.color}
  />
  <GeomLine linewidth={chart.geomLine.linewidth} />
  <GeomPoint size={chart.geomPoint.size} />
</GGPlot>
