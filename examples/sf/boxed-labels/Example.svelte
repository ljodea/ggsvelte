<script lang="ts">
  import {
    CoordFixed,
    GeomSf,
    GeomSfLabel,
    GGPlot,
    GuideNone,
    Inspect,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { pumpNeighbourhoods } from "./data.js";
</script>

<GGPlot
  data={pumpNeighbourhoods}
  aes={{ fill: "pump", label: "pump" }}
  width={640}
  height={400}
>
  <Inspect mode="exact" pin />
  <ThemeClassic />
  <CoordFixed />
  <GuideNone channel="fill" />
  <Labs
    title="The same names, on paper"
    subtitle="Each pump name sits on a measured box so the map stays readable"
  />
  <GeomSf alpha={0.75} linewidth={0.8} />
  <GeomSfLabel padding={3} radius={2} size={11} />
</GGPlot>
