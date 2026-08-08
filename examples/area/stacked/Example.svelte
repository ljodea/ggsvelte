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
  <GeomArea alpha={0.9} />
  <ScaleXDate labels="%b %Y" />
  <ScaleFillManual
    domain={["Disease", "Wounds", "Other"]}
    values={["#d14d41", "#014d64", "#4385be"]}
  />
  <ThemeEconomist />
  <GuideLegend channel="fill" focus />
  <Labs
    title="Stacked deaths by cause over time"
    subtitle="Monthly rates split so each band is one cause of death"
    x="Month"
    y="Deaths per 1,000 per year"
    fill="Cause"
  />
  <Inspect mode="x" pin />
</GGPlot>
