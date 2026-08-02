<script lang="ts">
  import {
    GeomHline,
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeTufte,
  } from "@ggsvelte/svelte";

  import { earthDensity } from "./data.js";
</script>

<GGPlot
  data={earthDensity}
  aes={{ x: "trial", y: "density" }}
  width={640}
  height={400}
>
  <ThemeTufte />
  <Labs
    title="A horizontal rule at a known value"
    subtitle="Twenty-nine density readings with a line at the modern earth density 5.517"
    x="Determination"
    y="Density of the earth (water = 1)"
  />
  <GeomLine linewidth={1.4} />
  <GeomPoint size={2.5} />
  <GeomHline
    yintercept={5.517}
    linewidth={1}
    alpha={0.7}
    aes={{ color: { value: "#888888" } }}
  />
</GGPlot>
