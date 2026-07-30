<script lang="ts">
  import {
    GeomJitter,
    GeomSmooth,
    GGPlot,
    GuideLegend,
    Inspect,
    Labs,
    Theme,
  } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";

  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";

  /**
   * Live homepage grammar plot. Dynamically imported so the section chrome +
   * static SVG shell can SSR without pulling @ggsvelte into the home node.
   *
   * Default step (Interaction): xy inspect (numeric crosshair) + GuideLegend focus.
   * Full palmerPenguins (333 complete cases).
   *
   * Labs titles must match `homeGrammarStaticSvgFromData` so the shell→live
   * upgrade does not flash raw field names onto the axes.
   */
  let {
    active,
  }: {
    active: number;
  } = $props();

  const chartTheme = $derived(contrastChartTheme());
</script>

<!--
  mode "xy": full crosshair on two continuous axes (not path auto "x").
  GuideLegend focus uses default row identity (`id` on palmerPenguins).
  GeomJitter + alpha: 333 points stack on integer measurements; seeded jitter
  (default 0.4·resolution) and alpha spread the cloud. degree 1 loess stays
  cheap when remounting.
-->
<GGPlot
  data={palmerPenguins}
  aes={{
    x: "flipperLengthMm",
    y: "bodyMassG",
    ...(active >= 1 && { color: "species" }),
  }}
  ariaLabel="Penguin body mass increases with flipper length, grouped by species"
>
  {#if active >= 3}
    <Inspect mode="xy" pin maxDistance={24} />
  {/if}
  <Theme name={chartTheme} />
  <Labs x="Flipper length mm" y="Body mass g" color="species" />
  {#if active >= 1}
    <GuideLegend channel="color" focus />
  {/if}
  <GeomJitter alpha={0.88} />
  {#if active >= 2}
    <GeomSmooth method="loess" span={0.75} degree={1} se={false} />
  {/if}
</GGPlot>
