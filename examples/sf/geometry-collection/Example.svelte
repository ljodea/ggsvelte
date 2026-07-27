<script lang="ts">
  import { GeomSf, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { collectionRegions } from "./data.js";
</script>

<GGPlot
  data={collectionRegions}
  aes={{ fill: "rate" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="GeometryCollection expand"
    subtitle="One GC cell → two polygon parts (#809 phase 6)"
    fill="rate"
  />
  <GeomSf alpha={0.9} linewidth={0.8} />
</GGPlot>
