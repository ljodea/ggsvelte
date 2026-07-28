<script lang="ts">
  import {
    GeomHex,
    GGPlot,
    Labs,
    ScaleFillContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { fijiQuakes } from "./data.js";
</script>

<GGPlot
  data={fijiQuakes}
  aes={{ x: "long", y: "lat" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="A thousand earthquakes off Fiji"
    subtitle="Every event above magnitude 4 since 1964, counted into hexagons"
    x="Longitude (°E)"
    y="Latitude (°)"
    fill="Events"
  />
  <GeomHex bins={18} />
</GGPlot>
