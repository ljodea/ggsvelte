<script lang="ts">
  import {
    CoordSf,
    GeomSf,
    GeomSfText,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { districts } from "./data.js";
</script>

<GGPlot
  data={districts}
  aes={{ fill: "rate", label: "district", color: "district" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <CoordSf />
  <Labs
    title="District rates (portable SF)"
    subtitle="geom_sf + geom_sf_text + coord_sf — GeoJSON strings, already projected"
    fill="Rate"
    color=""
  />
  <GeomSf linewidth={1.1} alpha={0.92} />
  <GeomSfText size={12} alpha={0.95} />
</GGPlot>
