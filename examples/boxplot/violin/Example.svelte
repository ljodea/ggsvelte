<script lang="ts">
  import {
    GeomViolin,
    GGPlot,
    Labs,
    ScaleFillManual,
    ScaleXDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { michelsonRuns } from "../by-category/data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "run", y: "velocity", fill: "run" }}
  width={640}
  height={400}
>
  <ThemeFew />
  <ScaleXDiscrete domain={["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"]} />
  <ScaleFillManual
    domain={["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"]}
    values={["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b"]}
  />
  <Labs
    title="Violin plots for the same five runs"
    subtitle="Mirrored density of velocity so the shape of each run is visible"
    x="Run"
    y="Velocity (km/s − 299,000)"
    fill=""
  />
  <GeomViolin scale="width" trim={true} alpha={0.75} linewidth={0.6} />
</GGPlot>
