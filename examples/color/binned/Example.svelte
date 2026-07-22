<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    guideColorsteps,
    scaleColorBinned,
  } from "@ggsvelte/svelte";

  import { readings } from "./data.js";
</script>

<GGPlot
  data={readings}
  aes={{ x: "hour", y: "pm25", color: "pm25" }}
  scales={scaleColorBinned({
    breaks: [0, 12, 35, 55, 100],
    range: ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  })}
  guides={{
    color: guideColorsteps({ position: "bottom", direction: "horizontal" }),
  }}
  labs={{
    title: "Particle pollution by hour",
    x: "Hour",
    y: "PM2.5 (µg/m³)",
    color: "PM2.5 band",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={5} />
</GGPlot>
