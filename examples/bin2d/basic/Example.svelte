<script lang="ts">
  import {
    GeomBin2d,
    GGPlot,
    Inspect,
    Labs,
    ScaleFillContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { oldFaithful } from "./data.js";
</script>

<GGPlot
  data={oldFaithful}
  aes={{ x: "duration", y: "waiting" }}
  width={640}
  height={400}
>
  <Inspect mode="exact" pin />
  <ThemeMinimal />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="Two-dimensional bins for a dense cloud"
    subtitle="Waiting time against eruption length for Old Faithful"
    x="Eruption length (minutes)"
    y="Wait for the next eruption (minutes)"
    fill="Eruptions"
  />
  <GeomBin2d bins={16} />
</GGPlot>
