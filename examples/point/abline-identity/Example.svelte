<script lang="ts">
  import {
    GeomAbline,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { soporifics } from "./data.js";
</script>

<GGPlot
  data={soporifics}
  aes={{ x: "hyoscyamine", y: "hyoscine" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <Labs
    title="One drug beat the other for ten of eleven patients"
    subtitle="Cushny and Peebles, 1905: points above the line slept longer on hyoscine"
    x="Extra sleep on L-hyoscyamine (hours)"
    y="Extra sleep on L-hyoscine (hours)"
  />
  <GeomAbline slope={1} intercept={0} linewidth={1.2} />
  <GeomPoint size={3.5} />
</GGPlot>
