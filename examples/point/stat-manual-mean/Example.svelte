<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
    registerManual,
    ScaleColorDiscrete,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  // stat= override: the shell registers only its default stat (#1420).
  registerManual();

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "order", y: "velocity", color: "run" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeClassic />
  <ScaleColorDiscrete scheme="observable10" />
  <Labs
    title="Raw points with a manual mean per group"
    subtitle="Twenty faint measurements per run; the solid mark is that run's mean"
    x="Measurement, 1 to 100"
    y="Speed of light, km/s less 299,000"
    color="Run"
  />
  <GeomPoint size={2.4} alpha={0.35} />
  <GeomPoint stat="manual" fun="mean" size={6} alpha={0.95} />
</GGPlot>
