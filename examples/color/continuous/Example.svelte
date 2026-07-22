<script lang="ts">
  import { GeomPoint, GGPlot, scaleColorContinuous } from "@ggsvelte/svelte";

  import { stations } from "./data.js";
</script>

<GGPlot
  data={stations}
  aes={{ x: "elevation", y: "julyTemp", color: "elevation" }}
  scales={scaleColorContinuous({ scheme: "viridis" })}
  labs={{
    title: "It gets colder as you climb",
    x: "Elevation (m)",
    y: "July mean temperature (°C)",
    color: "Elevation (m)",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={4} />
</GGPlot>
