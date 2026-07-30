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
    title="Literacy and crime in France, 1833"
    subtitle="Guerry found no tidy relationship — higher means fewer crimes per head"
    x="Literate conscripts (%)"
    y="Population per crime against persons"
    color="Region"
  />
  <GuideLegend channel="color" focus />
  <GeomPoint size={3} />
</GGPlot>
