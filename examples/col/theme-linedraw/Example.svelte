<script lang="ts">
  import {
    GeomCol,
    GGPlot,
    Inspect,
    Labs,
    ScaleXContinuous,
    ThemeLinedraw,
  } from "@ggsvelte/svelte";

  import { chestSizes } from "./data.js";
</script>

<GGPlot
  data={chestSizes}
  aes={{ x: "chest", y: "soldiers" }}
  width={640}
  height={400}
>
  <GeomCol />
  <ScaleXContinuous nice={false} />
  <ThemeLinedraw />
  <Labs
    title="The same columns under a linedraw theme"
    subtitle="Same chest counts with hard black lines and no grey fill"
    x="Chest circumference (inches)"
    y="Soldiers"
  />
  <Inspect mode="exact" pin />
</GGPlot>
