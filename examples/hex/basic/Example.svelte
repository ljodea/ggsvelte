<script lang="ts">
  import {
    GeomHex,
    GGPlot,
    Inspect,
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
  <Inspect mode="exact" pin />
  <ThemeMinimal />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="Hex bins for a dense cloud"
    subtitle="A thousand earthquakes by location off Fiji"
    x="Longitude (°E)"
    y="Latitude (°)"
    fill="Events"
  />
  <GeomHex bins={18} />
</GGPlot>
