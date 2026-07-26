<script lang="ts">
  import {
    GeomCol,
    GGPlot,
    Labs,
    ScaleXContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { chestSizes } from "./data.js";
</script>

<GGPlot
  data={chestSizes}
  aes={{ x: "chest", y: "soldiers" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleXContinuous nice={false} />
  <Labs
    title="Chests of 5,738 Scottish soldiers"
    subtitle="The measurements that made the normal curve a claim about people"
    x="Chest circumference (inches)"
    y="Soldiers"
  />
  <GeomCol />
</GGPlot>
