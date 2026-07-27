<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { groupScatter } from "./data.js";
</script>

<GGPlot
  data={groupScatter}
  aes={{ x: "x", y: "y", color: "series" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorManual domain={["A", "B"]} values={["#1b9e77", "#d95f02"]} />
  <Labs
    title="stat manual: per-group mean centroids"
    subtitle="Faint points are identity; large points are fun=mean per series"
    x="x"
    y="y"
    color="Series"
  />
  <GeomPoint size={2.5} alpha={0.35} />
  <GeomPoint stat="manual" fun="mean" size={5} alpha={0.95} />
</GGPlot>
