<script lang="ts">
  import { GeomContour, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { peakGrid } from "./data.js";
</script>

<GGPlot
  data={peakGrid}
  aes={{ x: "x", y: "y", z: "z" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Contour isolines"
    subtitle="Marching-squares levels of a radial peak (ggplot2 geom_contour)"
    x="x"
    y="y"
  />
  <GeomContour bins={8} linewidth={1.2} />
</GGPlot>
