<script lang="ts">
  import {
    GeomCol,
    GGPlot,
    Inspect,
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
  <Inspect mode="exact" pin />
  <ThemeClassic />
  <ScaleXContinuous nice={false} />
  <Labs
    title="Counts across ordered chest sizes"
    subtitle="How many men fell in each chest-measure class"
    x="Chest circumference (inches)"
    y="Soldiers"
  />
  <GeomCol />
</GGPlot>
