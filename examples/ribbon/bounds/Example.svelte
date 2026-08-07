<script lang="ts">
  import {
    GeomLine,
    GeomRibbon,
    GGPlot,
    Inspect,
    Labs,
    ScaleYSqrt,
    ThemeClean,
  } from "@ggsvelte/svelte";

  import { breslauBurials } from "./data.js";
</script>

<GGPlot
  data={breslauBurials}
  aes={{ x: "age", ymin: "lo", ymax: "hi" }}
  width={640}
  height={400}
>
  <Inspect mode="x" pin />
  <ThemeClean />
  <ScaleYSqrt />
  <Labs
    title="A ribbon for year-to-year range"
    subtitle="Mean burials by age with a band from the lowest to highest year at each age"
    x="Age at death"
    y="Burials per year (square-root scale)"
  />
  <GeomRibbon alpha={0.35} aes={{ fill: { value: "#4385be" } }} />
  <GeomLine
    aes={{ x: "age", y: "mean", color: { value: "#1a4a6b" } }}
    linewidth={1.6}
  />
</GGPlot>
