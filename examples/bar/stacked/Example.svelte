<script lang="ts">
  import {
    GeomBar,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleFillDiscrete,
    ScaleXDiscrete,
    ThemeLight,
  } from "@ggsvelte/svelte";

  import { pyxTrial } from "./data.js";
</script>

<GGPlot
  data={pyxTrial}
  aes={{ x: "bag", fill: "deviation", weight: "count" }}
  key={(row) => `${row.bag}:${row.deviation}`}
  width={640}
  height={400}
>
  <ThemeLight />
  <ScaleXDiscrete
    domain={["1 and 2", "3", "4", "5", "6", "7", "8", "9", "10"]}
  />
  <ScaleFillDiscrete
    domain={[
      "Below -R",
      "(-R to -.2)",
      "(-.2 to -.1)",
      "(-.1 to 0)",
      "(0 to .1)",
      "(.1 to .2)",
      "(.2 to R)",
      "Above R",
    ]}
    scheme="flexoki"
  />
  <Labs
    title="The Trial of the Pyx, 1848"
    subtitle="Each bag of 1,000 sovereigns, split by deviation from standard weight"
    x="Bag"
    y="Sovereigns"
    fill="Deviation"
  />
  <GuideLegend channel="fill" focus />
  <GeomBar />
</GGPlot>
