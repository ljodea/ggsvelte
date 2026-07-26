<script lang="ts">
  import {
    CoordFlip,
    GeomCol,
    GGPlot,
    Labs,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { armadaTonnage } from "./data.js";
</script>

<GGPlot
  data={armadaTonnage}
  aes={{ x: "squadron", y: "tons" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <CoordFlip />
  <Labs
    title="Armada tonnage by squadron, 1588"
    subtitle="Ordered smallest to largest, so coord flip reads bottom-up"
    x="Squadron"
    y="Tons"
  />
  <GeomCol />
</GGPlot>
