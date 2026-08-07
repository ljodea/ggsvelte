<script lang="ts">
  import {
    CoordFixed,
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
  } from "@ggsvelte/svelte";

  import { unitCircle } from "./data.js";
</script>

<GGPlot
  data={unitCircle}
  aes={{ x: "x", y: "y" }}
  width="container"
  height={440}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <CoordFixed />
  <Labs
    title="Equal data units on both axes"
    subtitle="A circular cloud stays circular when the aspect ratio locks x and y"
    x="x"
    y="y"
  />
  <GeomPoint size={3} />
</GGPlot>
