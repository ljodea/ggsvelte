<script lang="ts">
  import {
    GeomPoint,
    GeomQuantile,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { coffeeRatings } from "./data.js";
</script>

<GGPlot
  data={coffeeRatings}
  aes={{ x: "aroma", y: "flavor" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Flavor against aroma in cupping scores"
    subtitle="Lower quartile, median, and upper quartile of flavor as aroma rises"
    x="Aroma"
    y="Flavor"
  />
  <GeomPoint alpha={0.3} size={2} />
  <GeomQuantile linewidth={1.4} />
</GGPlot>
