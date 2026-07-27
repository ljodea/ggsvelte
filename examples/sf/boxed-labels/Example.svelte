<script lang="ts">
  import {
    GeomSf,
    GeomSfLabel,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { boxedRegions } from "./data.js";
</script>

<GGPlot
  data={boxedRegions}
  aes={{ fill: "rate", label: "region" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="geom_sf_label boxed labels"
    subtitle="Measured paper-backed boxes at representative SF points (#809)"
    fill="rate"
  />
  <GeomSf alpha={0.45} linewidth={0.8} />
  <GeomSfLabel padding={3} radius={2} size={13} />
</GGPlot>
