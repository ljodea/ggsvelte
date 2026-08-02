<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleColorDiscrete,
    ThemeFew,
  } from "@ggsvelte/svelte";

  import { guerry } from "./data.js";
</script>

<GGPlot
  data={guerry}
  aes={{ x: "literacy", y: "crimePersons", color: "region" }}
  width={640}
  height={400}
>
  <ThemeFew />
  <ScaleColorDiscrete scheme="tableau10" />
  <Labs
    title="Two measures coloured by region"
    subtitle="Literacy against crime rate; colour marks the region of each department"
    x="Literate conscripts (%)"
    y="Population per crime against persons"
    color="Region"
  />
  <GuideLegend channel="color" focus />
  <GeomPoint size={3} />
</GGPlot>
