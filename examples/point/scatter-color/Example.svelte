<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { guerry } from "./data.js";
</script>

<GGPlot
  data={guerry}
  aes={{ x: "literacy", y: "crimePersons", color: "region" }}
  theme="few"
  scales={{ color: { type: "ordinal", scheme: "tableau10" } }}
  labs={{
    title: "Literacy and crime in France, 1833",
    subtitle:
      "Guerry found no tidy relationship — higher means fewer crimes per head",
    x: "Literate conscripts (%)",
    y: "Population per crime against persons",
    color: "Region",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={3} />
</GGPlot>
