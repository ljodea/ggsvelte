<script lang="ts">
  import { GeomRect, GGPlot } from "@ggsvelte/svelte";

  import { bands } from "./data.js";
</script>

<GGPlot
  data={bands}
  aes={{
    xmin: "xmin",
    xmax: "xmax",
    ymin: "ymin",
    ymax: "ymax",
    fill: "period",
  }}
  labs={{
    title: "Shaded regions (geom rect)",
    x: "Time",
    y: "Value",
  }}
  width={640}
  height={400}
>
  <GeomRect alpha={0.75} />
</GGPlot>
