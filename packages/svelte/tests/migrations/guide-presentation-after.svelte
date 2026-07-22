<script lang="ts">
  import { GGPlot, GeomPoint, guideLegend } from "../../src/lib/index.js";

  // Since 0.8, guide presentation is portable and responsive without changing scale math.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "region" }}
  guides={{
    color: guideLegend({ position: "bottom", direction: "horizontal" }),
  }}
>
  <GeomPoint />
</GGPlot>
