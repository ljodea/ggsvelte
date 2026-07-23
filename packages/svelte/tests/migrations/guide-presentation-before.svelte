<script lang="ts">
  import { GGPlot, GeomPoint } from "../../src/lib/index.js";

  // Before 0.8, automatic legends always occupied the fixed right column.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", color: "region" }}>
  <GeomPoint />
</GGPlot>
