<script lang="ts">
  import {
    GeomAbline,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { ablineScatter } from "./data.js";
</script>

<GGPlot data={ablineScatter} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeMinimal />
  <Labs
    title="geom_abline"
    subtitle="Identity reference y = x clipped to the panel"
    x="x"
    y="y"
  />
  <GeomPoint size={3.5} />
  <GeomAbline slope={1} intercept={0} linewidth={1.2} />
</GGPlot>
