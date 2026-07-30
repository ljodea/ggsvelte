<script lang="ts">
  import { GeomPoint, GGPlot, GuideLegend } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- After 0.19: focus lives on GuideLegend for that aesthetic. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "series" }} key="id">
  <GuideLegend channel="color" focus />
  <GeomPoint />
</GGPlot>
