<script lang="ts">
  import { GeomDotplot, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { samples } from "./data.js";
</script>

<GGPlot data={samples} aes={{ x: "value" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Dotplot histodot"
    subtitle="One point per observation, stacked in fixed bins (ggplot2 geom_dotplot)"
    x="value"
    y="stack"
  />
  <GeomDotplot binwidth={0.5} boundary={0} stackdir="up" />
</GGPlot>
