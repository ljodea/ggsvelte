<script lang="ts">
  // @ts-nocheck — historical GGPlot theme prop (removed in 0.13.0)
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- Before 0.11: theme was a top-level GGPlot prop. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} theme="dark">
  <GeomPoint />
</GGPlot>
