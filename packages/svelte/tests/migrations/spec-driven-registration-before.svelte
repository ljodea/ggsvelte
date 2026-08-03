<script lang="ts">
  import { GGPlot } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
  ];
</script>

<!-- Before 0.27: any geom worked from the layers prop — the core barrel
     bundled and registered the full grammar for every app. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "smooth" }]}
  width={480}
  height={320}
/>
