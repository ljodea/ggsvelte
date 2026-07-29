<script lang="ts">
  import {
    GeomJitter,
    GeomSmooth,
    GGPlot,
    Labs,
    Theme,
  } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";

  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";

  /**
   * Live homepage grammar plot. Dynamically imported so the section chrome +
   * static SVG shell can SSR without pulling @ggsvelte into the home node.
   *
   * Default step (Interaction): xy inspect (numeric crosshair) + legendFocus.
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
  legendFocus needs stable row keys (`id` on palmerPenguins).
  GeomJitter + alpha: 333 points stack on integer measurements; seeded jitter
  (default 0.4·resolution) and alpha spread the cloud. degree 1 loess stays
  cheap when remounting.
-->
<GGPlot
  data={palmerPenguins}
  key="id"
  aes={{
    x: "flipperLengthMm",
    y: "bodyMassG",
    ...(active >= 1 && { color: "species" }),
  }}
  inspect={active >= 3 ? { mode: "xy", pin: true, maxDistance: 24 } : false}
  legendFocus={active >= 1}
  ariaLabel="Penguin body mass increases with flipper length, grouped by species"
>
  <Theme name={chartTheme} />
  <Labs x="Flipper length mm" y="Body mass g" color="species" />
  <GeomJitter alpha={0.88} />
  {#if active >= 2}
    <GeomSmooth method="loess" span={0.75} degree={1} se={false} />
  {/if}
</GGPlot>
