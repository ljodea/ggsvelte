/**
 * Consumer-facing code fragments for the themes page.
 * Kept outside .svelte so the compiler never sees a literal </script> close tag.
 *
 * The hero temperatures snippet is built from TEMPERATURES_CHART so it cannot
 * drift from what TemperaturesSpecimen renders (#990).
 */

import { formatMonthBreaksLiteral, TEMPERATURES_CHART } from "./temperatures-chart.js";

export function heroThemePaletteSnippet(theme: string, scheme: string): string {
  const chart = TEMPERATURES_CHART;
  const breaks = formatMonthBreaksLiteral(chart.monthBreaks);
  return `<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot, Labs, Scale, Theme } from "@ggsvelte/svelte";

  const temperatures = [
    { city: "Reykjavik", month: 1, temp: -0.5 },
    { city: "Reykjavik", month: 7, temp: 10.6 },
    { city: "Berlin", month: 1, temp: 0.6 },
    { city: "Berlin", month: 7, temp: 19.0 },
    { city: "Singapore", month: 1, temp: 26.5 },
    { city: "Singapore", month: 7, temp: 27.9 },
    // …full series in your app
  ];
</script>

<GGPlot
  data={temperatures}
  aes={{ x: "${chart.aes.x}", y: "${chart.aes.y}", color: "${chart.aes.color}" }}
  key="${chart.key}"
  inspect={{ mode: "${chart.inspect.mode}" }}
  legendFocus
  height={400}
>
  <Theme name="${theme}" />
  <Scale
    value={{
      x: { breaks: ${breaks} },
      color: { type: "ordinal", scheme: "${scheme}" },
    }}
  />
  <Labs
    title="${chart.labs.title}"
    x="${chart.labs.x}"
    y="${chart.labs.y}"
    color="${chart.labs.color}"
  />
  <GeomLine linewidth={${String(chart.geomLine.linewidth)}} />
  <GeomPoint size={${String(chart.geomPoint.size)}} />
</GGPlot>`;
}

export const SEQUENTIAL_RASTER_SNIPPET = `<script lang="ts">
  import { GeomRaster, GGPlot, Labs, Scale } from "@ggsvelte/svelte";

  // Regular x/y/z surface (48 cells in the live demos).
  const grid = [
    { x: 0, y: 0, z: 0.12 },
    { x: 1, y: 0, z: 0.45 },
    { x: 2, y: 0, z: 0.88 },
    // …
  ];
</script>

<GGPlot
  data={grid}
  aes={{ x: "x", y: "y", fill: "z" }}
  height={400}
>
  <Scale
    value={{
      fill: { type: "sequential", scheme: "viridis" },
      // reverse: true
      // domain: [0.3, 0.7]  // pin inside actual z
      // range: ["#2d1e2f", "#3d5a80", "#e76f51"]
    }}
  />
  <Labs title="Density surface" x="x" y="y" />
  <GeomRaster />
</GGPlot>`;
