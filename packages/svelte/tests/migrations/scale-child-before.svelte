<script lang="ts">
  // @ts-nocheck — historical GGPlot scales prop (removed in 0.13.0)
  import {
    GeomPoint,
    GGPlot,
    scaleColorDiscrete,
  } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- Before 0.11: scales was a top-level GGPlot prop. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "c" }}
  scales={scaleColorDiscrete({ scheme: "colorblind" })}
>
  <GeomPoint />
</GGPlot>
