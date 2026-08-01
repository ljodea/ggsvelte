<script lang="ts">
  import {
    GeomBar,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleFillDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { beerProduction } from "./data.js";
</script>

<GGPlot
  data={beerProduction}
  aes={{ x: "year", fill: "package", weight: "barrelsMillions" }}
  width={640}
  height={400}
>
  <ThemeFew />
  <ScaleFillDiscrete scheme="tableau10" />
  <Labs
    title="US beer production by package type"
    subtitle="Millions of barrels each year as bottles and cans, kegs, or on-premises pours"
    x="Year"
    y="Millions of barrels"
    fill="Package"
  />
  <GuideLegend channel="fill" focus />
  <GeomBar position="dodge" />
</GGPlot>
