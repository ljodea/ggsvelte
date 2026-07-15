<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { metrics } from "./data.js";
</script>

<GGPlot
  data={metrics}
  aes={{ x: "month", y: "value" }}
  facet={{ wrap: "metric", ncol: 3, scales: "free_y" }}
  labs={{
    title: "Twelve months, three magnitudes",
    x: "Month",
    y: "Value",
  }}
  width={640}
  height={400}
>
  <GeomLine />
  <GeomPoint size={2} />
</GGPlot>
