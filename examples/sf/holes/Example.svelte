<script lang="ts">
  import {
    CoordFixed,
    GeomSf,
    GGPlot,
    Inspect,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { slopeBands } from "./data.js";
</script>

<GGPlot data={slopeBands} aes={{ fill: "band" }} width={640} height={400}>
  <Inspect mode="exact" pin />
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Polygons with holes"
    subtitle="Two elevation bands where the higher ring is a hole in the lower"
    fill="Height band"
  />
  <GeomSf alpha={0.75} linewidth={0.9} />
</GGPlot>
