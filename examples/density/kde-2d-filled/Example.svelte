<script lang="ts">
  import {
    GeomDensity2dFilled,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { twinClouds } from "./data.js";
</script>

<GGPlot data={twinClouds} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="2D density filled bands"
    subtitle="Closed KDE rings; fill defaults to after_stat(level)"
    x="x"
    y="y"
  />
  <GeomPoint alpha={0.45} size={2.0} />
  <GeomDensity2dFilled bins={5} n={40} alpha={0.55} />
</GGPlot>
