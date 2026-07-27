<script lang="ts">
  import {
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { twinClouds } from "./data.js";
</script>

<GGPlot
  data={twinClouds}
  aes={{ x: "x", y: "y", color: "g" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Ellipse confidence rings"
    subtitle="Bivariate normal 95% ellipses per group (ggplot2 stat_ellipse)"
    x="x"
    y="y"
  />
  <GeomPoint alpha={0.65} size={2.5} />
  <GeomPath stat="ellipse" level={0.95} segments={51} linewidth={1.3} />
</GGPlot>
