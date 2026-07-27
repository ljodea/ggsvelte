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
    { city: "Price of stocks", month: 1770, temp: 79.6 },
    { city: "Price of stocks", month: 1820, temp: 68.59 },
    { city: "Price of bread", month: 1770, temp: 23.47 },
    { city: "Price of bread", month: 1820, temp: 48.39 },
    { city: "Exports", month: 1770, temp: 11.58 },
    { city: "Exports", month: 1820, temp: 50.18 },
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

  // Macdonell man-count grid (48 cells in the live demos).
  const grid = [
    { x: 0, y: 0, z: 12 },
    { x: 1, y: 0, z: 28 },
    { x: 2, y: 0, z: 41 },
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
      // domain: [15, 40]  // pin inside actual man counts
      // range: ["#2d1e2f", "#3d5a80", "#e76f51"]
    }}
  />
  <Labs title="Macdonell stature × finger counts" x="Finger index" y="Height index" />
  <GeomRaster />
</GGPlot>`;
