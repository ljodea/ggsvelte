<script lang="ts">
  import { GeomBlank, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { rangeEndpoints } from "./data.js";
</script>

<GGPlot data={rangeEndpoints} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Axes trained with no marks"
    subtitle="geom_blank alone — useful when co-layering later or pinning domains"
    x="x"
    y="y"
  />
  <GeomBlank />
</GGPlot>
