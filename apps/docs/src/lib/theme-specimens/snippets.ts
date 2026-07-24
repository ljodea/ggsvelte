/**
 * Consumer-facing code fragments for the themes page.
 * Kept outside .svelte so the compiler never sees a literal </script> close tag.
 */

export function heroThemePaletteSnippet(theme: string, scheme: string): string {
  return `<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";

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
  aes={{ x: "month", y: "temp", color: "city" }}
  theme="${theme}"
  scales={{
    x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    color: { type: "ordinal", scheme: "${scheme}" },
  }}
  labs={{
    title: "Monthly mean temperature",
    x: "Month",
    y: "Temperature (°C)",
    color: "City",
  }}
  inspect={{ mode: "x" }}
  legendFocus
  height={400}
>
  <GeomLine linewidth={2} />
  <GeomPoint size={2.5} />
</GGPlot>`;
}

export const SEQUENTIAL_RASTER_SNIPPET = `<script lang="ts">
  import { GeomRaster, GGPlot } from "@ggsvelte/svelte";

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
  scales={{
    fill: { type: "sequential", scheme: "viridis" },
    // reverse: true
    // domain: [0.3, 0.7]  // pin inside actual z
    // range: ["#2d1e2f", "#3d5a80", "#e76f51"]
  }}
  labs={{ title: "Density surface", x: "x", y: "y" }}
  height={400}
>
  <GeomRaster />
</GGPlot>`;
