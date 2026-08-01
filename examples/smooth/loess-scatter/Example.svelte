<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    Labs,
    ThemeTufte,
  } from "@ggsvelte/svelte";

  import { chocolateBars } from "./data.js";
</script>

<GGPlot
  data={chocolateBars}
  aes={{ x: "cocoaPercent", y: "rating" }}
  width={640}
  height={400}
>
  <ThemeTufte />
  <Labs
    title="Cocoa percent against bar rating"
    subtitle="Loess through 2,530 chocolate reviews, with a confidence band"
    x="Cocoa (%)"
    y="Rating (1–4)"
  />
  <GeomSmooth method="loess" span={0.75} />
  <GeomPoint alpha={0.25} size={2} />
</GGPlot>
