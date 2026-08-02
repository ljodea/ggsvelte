<script lang="ts">
  import {
    GeomCol,
    GeomText,
    GGPlot,
    Labs,
    ScaleXDiscrete,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { polioTrial } from "./data.js";
</script>

<GGPlot
  data={polioTrial}
  aes={{ x: "group", y: "rate" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <ScaleXDiscrete domain={["Vaccinated", "Placebo", "Not inoculated"]} />
  <Labs
    title="Columns with the rate printed on each bar"
    subtitle="Paralytic polio per 100,000 children in each arm of the trial"
    x="Group"
    y="Cases per 100,000"
  />
  <GeomCol width={0.7} />
  <GeomText aes={{ label: "label" }} dy={-8} />
</GGPlot>
