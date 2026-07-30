<script lang="ts">
  import {
    GeomArea,
    GGPlot,
    GuideLegend,
    Inspect,
    Labs,
    ScaleFillManual,
    ScaleXDate,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { crimeanMortality } from "./data.js";
</script>

<GGPlot
  data={crimeanMortality}
  aes={{ x: "month", y: "deaths", fill: "cause" }}
  width={640}
  height={400}
>
  <Inspect identity={(row) => `${row.month}:${row.cause}`} />
  <ThemeEconomist />
  <ScaleXDate labels="%b %Y" />
  <ScaleFillManual
    domain={["Disease", "Wounds", "Other"]}
    values={["#d14d41", "#014d64", "#4385be"]}
  />
  <Labs
    title="Deaths in the Crimea, 1854–56"
    subtitle="Annual rate per 1,000 — disease dwarfs combat, then collapses"
    x="Month"
    y="Deaths per 1,000 per year"
    fill="Cause"
  />
  <GuideLegend channel="fill" focus />
  <GeomArea alpha={0.9} />
</GGPlot>
