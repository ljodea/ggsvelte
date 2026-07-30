<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- Before 0.19: legendFocus was a plot-host prop. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "series" }}
  key="id"
  legendFocus
>
  <GeomPoint />
</GGPlot>
