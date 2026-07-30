<script lang="ts">
  import {
    Inspect,
    GeomBar,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleFillDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { edgeworthDeaths } from "./data.js";
</script>

<GGPlot
  data={edgeworthDeaths}
  aes={{ x: "year", fill: "county", weight: "deaths" }}
  width={640}
  height={400}
>
  <Inspect identity={(row) => `${row.year}:${row.county}`} />
  <ThemeFew />
  <ScaleFillDiscrete scheme="tableau10" />
  <Labs
    title="Deaths in six English counties, 1876–82"
    subtitle="Edgeworth's two-way table, decades before Fisher named the method"
    x="Year"
    y="Deaths per million"
    fill="County"
  />
  <GuideLegend channel="fill" focus />
  <GeomBar position="dodge" />
</GGPlot>
