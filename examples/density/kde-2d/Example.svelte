<script lang="ts">
  import {
    GeomDensity2d,
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
    title="2D density isolines"
    subtitle="Product Gaussian KDE contours (ggplot2 geom_density_2d)"
    x="x"
    y="y"
  />
  <GeomPoint alpha={0.55} size={2.2} />
  <GeomDensity2d bins={5} n={40} linewidth={1.2} />
</GGPlot>
