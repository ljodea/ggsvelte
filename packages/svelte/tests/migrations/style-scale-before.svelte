<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";

  // Before 0.8, applications precomputed symbol radii.
  const rows = [
    { x: 1, y: 2, radius: 2 },
    { x: 2, y: 3, radius: 5 },
    { x: 3, y: 4, radius: 9 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", size: "radius" }}
  scales={{ size: { type: "identity" } }}
>
  <GeomPoint />
</GGPlot>
