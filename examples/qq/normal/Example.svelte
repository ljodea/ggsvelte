<script lang="ts">
  import {
    GeomQq,
    GeomQqLine,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { heights } from "./data.js";
</script>

<GGPlot data={heights} aes={{ sample: "height" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="geom_qq + geom_qq_line"
    subtitle="Sample quantiles vs theoretical normal; line through quartile match"
    x="Theoretical"
    y="Sample"
  />
  <GeomQq size={2.5} alpha={0.85} />
  <GeomQqLine linewidth={1.2} alpha={0.7} />
</GGPlot>
