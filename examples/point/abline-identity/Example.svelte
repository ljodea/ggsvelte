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
    title="Points against the identity line"
    subtitle="Ten of eleven patients improve more on one drug than the other"
    x="Extra sleep on L-hyoscyamine (hours)"
    y="Extra sleep on L-hyoscine (hours)"
  />
  <GeomAbline slope={1} intercept={0} linewidth={1.2} />
  <GeomPoint size={3.5} />
</GGPlot>
