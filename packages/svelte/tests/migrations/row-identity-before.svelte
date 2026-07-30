<script lang="ts">
  import { GeomPoint, GGPlot, Inspect } from "../../src/lib/index.js";

  const rows = [
    { country: "Japan", year: 812, temp: 6.1 },
    { country: "Korea", year: 900, temp: 5.8 },
  ];
</script>

<!-- Before 0.21: plot-level key. -->
<GGPlot data={rows} aes={{ x: "year", y: "temp" }} key="country">
  <Inspect />
  <GeomPoint />
</GGPlot>
