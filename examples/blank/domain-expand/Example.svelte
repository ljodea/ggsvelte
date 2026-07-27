<script lang="ts">
  import {
    GeomBlank,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { plannedRange } from "./data.js";
</script>

<GGPlot data={plannedRange} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Expand scales without extra marks"
    subtitle="geom_blank maps x_plan / y_plan for domain training only"
    x="x (observed)"
    y="y (observed)"
  />
  <GeomPoint size={3.5} alpha={0.9} />
  <GeomBlank aes={{ x: "x_plan", y: "y_plan" }} />
</GGPlot>
