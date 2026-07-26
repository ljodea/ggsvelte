<script lang="ts">
  import {
    CoordFixed,
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { figureEight } from "./data.js";
</script>

<GGPlot data={figureEight} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Figure-eight path in data order"
    subtitle="geom_path keeps row order; geom_line would sort by x"
    x="x"
    y="y"
  />
  <GeomPath linewidth={2} alpha={0.95} />
  <GeomPoint size={2.2} alpha={0.55} />
</GGPlot>
