<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorDiscrete,
    ThemeVoid,
  } from "@ggsvelte/svelte";

  import { voidScatter } from "./data.js";
</script>

<GGPlot
  data={voidScatter}
  aes={{ x: "x", y: "y", color: "group" }}
  width={640}
  height={400}
>
  <ThemeVoid />
  <ScaleColorDiscrete scheme="colorblind" />
  <Labs
    title="theme_void — marks only"
    subtitle="No axes, grid, or panel; useful for maps, logos, and free-form composition"
    color="Group"
  />
  <GeomPoint size={3.5} />
</GGPlot>
