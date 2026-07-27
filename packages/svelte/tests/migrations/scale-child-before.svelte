<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleColorDiscrete,
  } from "../../src/lib/index.js";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- Before 0.11: scales was a top-level GGPlot prop. -->
<Plot
  data={rows}
  aes={{ x: "x", y: "y", color: "c" }}
  scales={scaleColorDiscrete({ scheme: "colorblind" })}
>
  <GeomPoint />
</Plot>
