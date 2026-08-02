<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GeomVline,
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
    title="A vertical rule at a known index"
    subtitle="Determinations in reported order; the rule marks the trial after which the wire changed"
    x="Determination"
    y="Density of the earth (water = 1)"
  />
  <GeomLine linewidth={1.4} />
  <GeomPoint size={2.5} />
  <GeomVline xintercept={6.5} aes={{ color: { value: "#d4615c" } }} />
</GGPlot>
