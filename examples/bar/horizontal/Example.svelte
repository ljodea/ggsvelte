<script lang="ts">
  import {
    CoordFlip,
    GeomCol,
    GGPlot,
    Inspect,
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
  <Inspect mode="exact" pin />
  <ThemeFivethirtyeight />
  <CoordFlip />
  <Labs
    title="Category totals, flipped so labels read across"
    subtitle="Ordered smallest to largest so the flip reads bottom-up"
    x="Squadron"
    y="Tons"
  />
  <GeomCol />
</GGPlot>
