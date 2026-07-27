<script lang="ts">
  import {
    GeomSf,
    GeomSfText,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { labeledRegions } from "./data.js";
</script>

<GGPlot
  data={labeledRegions}
  aes={{ fill: "rate", label: "region" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="geom_sf_text region labels"
    subtitle="Labels at representative points from GeoJSON geometries (#809)"
    fill="rate"
  />
  <GeomSf alpha={0.55} linewidth={0.8} />
  <GeomSfText size={14} />
</GGPlot>
