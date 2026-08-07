<script lang="ts">
  import {
    GeomJitter,
    GGPlot,
    Inspect,
    Labs,
    ThemeClean,
  } from "@ggsvelte/svelte";

  import { fastfoodMenu } from "./data.js";
</script>

<GGPlot
  data={fastfoodMenu}
  aes={{ x: "restaurant", y: "calories" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeClean />
  <Labs
    title="Menu calories, spread so items do not stack"
    subtitle="Each point is one entrée. Jitter separates items that share a restaurant"
    x="Restaurant"
    y="Calories"
  />
  <GeomJitter width={0.22} height={0} alpha={0.65} />
</GGPlot>
