<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- Before 0.11: theme was a top-level GGPlot prop. -->
<Plot data={rows} aes={{ x: "x", y: "y" }} theme="dark">
  <GeomPoint />
</Plot>
