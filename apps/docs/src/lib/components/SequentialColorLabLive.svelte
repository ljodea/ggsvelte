<script lang="ts">
  import { GeomRaster, GGPlot, Labs, Scale, Theme } from "@ggsvelte/svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  import { grid } from "$lib/theme-specimens/data";

  const {
    label,
    scale,
    height,
  }: {
    label: string;
    scale: ColorScaleSpec;
    height: number;
  } = $props();
</script>

<GGPlot
  data={grid}
  aes={{ x: "x", y: "y", fill: "z" }}
  inspect={{ mode: "xy" }}
  {height}
  ariaLabel={`${label} sequential color example`}
>
  <Scale value={{ fill: scale }} />
  <Theme name="light" />
  <Labs
    title={`${label} Macdonell counts`}
    x="Finger index"
    y="Height index"
    fill="Men"
  />
  <GeomRaster />
</GGPlot>
