<script lang="ts">
  import { GeomRaster, GGPlot } from "@ggsvelte/svelte";

  import { grid } from "./data.js";
</script>

<GGPlot
  data={grid}
  aes={{ x: "x", y: "y", fill: "z" }}
  labs={{
    title: "Regular density surface (geom raster)",
    x: "x",
    y: "y",
  }}
  width={640}
  height={400}
>
  <GeomRaster />
</GGPlot>
