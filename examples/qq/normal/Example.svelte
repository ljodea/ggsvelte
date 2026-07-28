<script lang="ts">
  import {
    GeomQq,
    GeomQqLine,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { michelson } from "./data.js";
</script>

<GGPlot data={michelson} aes={{ sample: "velocity" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Were Michelson's errors normal?"
    subtitle="His 100 runs against the normal they would follow if only chance moved them"
    x="Normal quantile"
    y="Speed of light, km/s less 299,000"
  />
  <GeomQq size={2.5} alpha={0.85} />
  <GeomQqLine linewidth={1.2} alpha={0.7} />
</GGPlot>
