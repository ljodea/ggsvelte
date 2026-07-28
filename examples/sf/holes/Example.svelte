<script lang="ts">
  import {
    CoordFixed,
    GeomSf,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { slopeBands } from "./data.js";
</script>

<GGPlot data={slopeBands} aes={{ fill: "band" }} width={640} height={400}>
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Two bands of the same hillside"
    subtitle="Each band is one ring with the next punched out; each hole is the ground above the higher contour"
    fill="Height band"
  />
  <GeomSf alpha={0.75} linewidth={0.9} />
</GGPlot>
