<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { overplottedGrid } from "./data.js";
</script>

<GGPlot
  data={overplottedGrid}
  aes={{ x: "x", y: "y", color: "series" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorManual domain={["A", "B"]} values={["#1b9e77", "#d95f02"]} />
  <Labs
    title="stat unique: first-wins aesthetic dedupe"
    subtitle="Each (x, y, series) triple is repeated thrice; unique draws it once"
    x="x"
    y="y"
    color="Series"
  />
  <GeomPoint stat="unique" size={3.5} alpha={0.9} />
</GGPlot>
