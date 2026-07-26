<script lang="ts">
  import {
    CoordFixed,
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { lissajousEight } from "./data.js";
</script>

<GGPlot data={lissajousEight} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Lissajous eight in data order"
    subtitle="geom_path keeps parametric order; geom_line would sort by x"
    x="x = sin(t)"
    y="y = sin(2t)"
  />
  <GeomPath linewidth={2} alpha={0.95} />
  <GeomPoint size={1.8} alpha={0.55} />
</GGPlot>
