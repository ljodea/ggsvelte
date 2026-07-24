<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    ScaleColorDiscrete,
  } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- After 0.11: compose scales as declaration-only child layers. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "c" }}>
  <ScaleColorDiscrete scheme="colorblind" />
  <GeomPoint />
</GGPlot>
