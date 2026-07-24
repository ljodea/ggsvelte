<script lang="ts">
  import { GeomBar, GGPlot } from "@ggsvelte/svelte";

  import { edgeworthDeaths } from "./data.js";
</script>

<GGPlot
  data={edgeworthDeaths}
  aes={{ x: "year", fill: "county", weight: "deaths" }}
  theme="few"
  scales={{ fill: { type: "ordinal", scheme: "tableau10" } }}
  labs={{
    title: "Deaths in six English counties, 1876–82",
    subtitle:
      "Edgeworth's two-way table, decades before Fisher named the method",
    x: "Year",
    y: "Deaths per million",
    fill: "County",
  }}
  width={640}
  height={400}
>
  <GeomBar position="dodge" />
</GGPlot>
