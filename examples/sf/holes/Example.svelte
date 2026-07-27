<script lang="ts">
  import { GeomSf, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { donuts } from "./data.js";
</script>

<GGPlot data={donuts} aes={{ fill: "rate" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="geom_sf polygon holes"
    subtitle="Even-odd interior rings punch holes (#809 phase 4)"
    fill="rate"
  />
  <GeomSf alpha={0.9} linewidth={0.9} />
</GGPlot>
