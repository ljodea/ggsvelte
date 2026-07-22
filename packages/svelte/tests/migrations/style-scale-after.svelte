<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleSizeContinuous,
  } from "../../src/lib/index.js";

  // In 0.8, map the semantic measure and let size interpolate in symbol area.
  const rows = [
    { x: 1, y: 2, magnitude: 4 },
    { x: 2, y: 3, magnitude: 25 },
    { x: 3, y: 4, magnitude: 81 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", size: "magnitude" }}
  scales={scaleSizeContinuous({ range: [2, 9] })}
>
  <GeomPoint />
</GGPlot>
