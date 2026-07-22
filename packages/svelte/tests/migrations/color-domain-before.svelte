<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2, score: -10 },
    { x: 2, y: 3, score: 50 },
    { x: 3, y: 4, score: 110 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "score" }}
  scales={{ color: { type: "sequential", domain: [0, 100] } }}
>
  <GeomPoint />
</GGPlot>
