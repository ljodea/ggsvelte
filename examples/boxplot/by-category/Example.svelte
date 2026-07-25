<script lang="ts">
  import {
    GeomBoxplot,
    GGPlot,
    Labs,
    ScaleXDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "run", y: "velocity" }}
  width={640}
  height={400}
>
  <ThemeFew />
  <ScaleXDiscrete domain={["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"]} />
  <Labs
    title="Michelson's five runs, 1879"
    subtitle="Twenty measurements each — the runs disagree more than the readings within them"
    x="Run"
    y="Velocity (km/s − 299,000)"
  />
  <GeomBoxplot />
</GGPlot>
