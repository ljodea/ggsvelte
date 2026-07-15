<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { countries } from "./data.js";
</script>

<GGPlot
  data={countries}
  aes={{ x: "gdp", y: "lifeExp", color: "region" }}
  scales={{ x: { type: "log", labels: "~s" } }}
  labs={{
    title: "Income and life expectancy",
    x: "GDP per capita (USD, log scale)",
    y: "Life expectancy (years)",
    color: "Region",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={3.5} />
</GGPlot>
