<script lang="ts">
  import {
    GeomPoint,
    GeomQuantile,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { fanningScatter } from "./data.js";
</script>

<GGPlot data={fanningScatter} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Quantile regression lines"
    subtitle="Linear y ~ x at τ = 0.25, 0.5, 0.75 (ggplot2 geom_quantile)"
    x="x"
    y="y"
  />
  <GeomPoint alpha={0.55} size={2.5} />
  <GeomQuantile linewidth={1.4} />
</GGPlot>
