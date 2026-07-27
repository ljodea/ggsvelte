<script lang="ts">
  import {
    GeomPolygon,
    GGPlot,
    Labs,
    ScaleFillManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { regions } from "./data.js";
</script>

<GGPlot
  data={regions}
  aes={{ x: "x", y: "y", group: "region", fill: "region" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleFillManual domain={["West", "East"]} values={["#4c78a8", "#f58518"]} />
  <Labs
    title="Two regions as polygons"
    subtitle="Vertices connect in data order; the path closes implicitly"
    x="x"
    y="y"
    fill=""
  />
  <GeomPolygon alpha={0.85} linewidth={1.5} />
</GGPlot>
