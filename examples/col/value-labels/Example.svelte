<script lang="ts">
  import { GeomCol, GeomText, GGPlot } from "@ggsvelte/svelte";

  import { polioTrial } from "./data.js";
</script>

<GGPlot
  data={polioTrial}
  aes={{ x: "group", y: "rate" }}
  theme="fivethirtyeight"
  scales={{ x: { domain: ["Vaccinated", "Placebo", "Not inoculated"] } }}
  labs={{
    title: "The Salk vaccine field trial, 1954",
    subtitle: "Paralytic polio per 100,000 children in the randomised arm",
    x: "Group",
    y: "Cases per 100,000",
  }}
  width={640}
  height={400}
>
  <GeomCol width={0.7} />
  <GeomText aes={{ label: "label" }} dy={-8} />
</GGPlot>
