<script lang="ts">
  import {
    CoordFixed,
    GeomSf,
    GGPlot,
    Labs,
    ScaleFillContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { heightRings } from "./data.js";
</script>

<GGPlot data={heightRings} aes={{ fill: "height" }} width={640} height={400}>
  <ThemeClassic />
  <CoordFixed />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="Maunga Whau as three simple features"
    subtitle="The ground above 130, 140 and 150 metres, one GeoJSON polygon per row"
    fill="Metres"
  />
  <GeomSf alpha={0.55} linewidth={0.9} />
</GGPlot>
