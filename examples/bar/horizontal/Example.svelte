<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { armadaTonnage } from "./data.js";
</script>

<GGPlot
  data={armadaTonnage}
  aes={{ x: "squadron", y: "tons" }}
  theme="fivethirtyeight"
  coord={{ type: "flip" }}
  labs={{
    title: "Armada tonnage by squadron, 1588",
    subtitle: "Ordered smallest to largest, so coord flip reads bottom-up",
    x: "Squadron",
    y: "Tons",
  }}
  width={640}
  height={400}
>
  <GeomCol />
</GGPlot>
