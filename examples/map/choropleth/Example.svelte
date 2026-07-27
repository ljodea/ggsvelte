<script lang="ts">
  import { GeomMap, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { fortifiedMap, regionRates } from "./data.js";
</script>

<GGPlot
  data={regionRates}
  aes={{ map_id: "region", fill: "rate" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Regional rates (toy map)"
    subtitle="Fortified long/lat polygons joined on region (geom_map)"
    fill="Rate"
  />
  <GeomMap map={{ values: fortifiedMap }} linewidth={1.2} alpha={0.95} />
</GGPlot>
