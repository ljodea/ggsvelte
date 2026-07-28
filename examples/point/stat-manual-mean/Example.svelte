<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorDiscrete,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "order", y: "velocity", color: "run" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorDiscrete scheme="tableau10" />
  <Labs
    title="Michelson's five runs, and where each settled"
    subtitle="Twenty measurements per run in faint marks; the solid mark is that run's mean"
    x="Measurement, 1 to 100"
    y="Speed of light, km/s less 299,000"
    color="Run"
  />
  <GeomPoint size={2.4} alpha={0.35} />
  <GeomPoint stat="manual" fun="mean" size={6} alpha={0.95} />
</GGPlot>
