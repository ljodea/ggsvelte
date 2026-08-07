<script lang="ts">
  import {
    GeomPointrange,
    GGPlot,
    Inspect,
    Labs,
    ScaleXDiscrete,
    ScaleYContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { groupIntervals } from "./data.js";
</script>

<GGPlot
  data={groupIntervals}
  aes={{ x: "group", y: "mid", ymin: "lo", ymax: "hi" }}
  width={640}
  height={400}
>
  <Inspect mode="x" pin />
  <ThemeMinimal />
  <ScaleXDiscrete domain={["A", "B", "C"]} />
  <ScaleYContinuous limits={[0, 12]} />
  <Labs
    title="Stem plus mid point"
    subtitle="Three identity intervals with a point at (x, y)"
    x="Group"
    y="Value"
  />
  <GeomPointrange
    linewidth={2.6}
    size={5.5}
    aes={{ color: { value: "#1a202c" } }}
  />
</GGPlot>
