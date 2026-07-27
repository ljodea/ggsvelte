<script lang="ts">
  import {
    GeomCol,
    GGPlot,
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
  <ThemeLinedraw />
  <ScaleXContinuous nice={false} />
  <Labs
    title="Chests of 5,738 Scottish soldiers"
    subtitle="theme_linedraw — black grid and border on white panel"
    x="Chest circumference (inches)"
    y="Soldiers"
  />
  <GeomCol />
</GGPlot>
