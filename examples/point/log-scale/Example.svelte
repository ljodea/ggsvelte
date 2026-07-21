<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot, scaleXLog10 } from "@ggsvelte/svelte";

  import { countries } from "./data.js";
</script>

<GGPlot
  data={countries}
  aes={{ x: "gdp", y: "lifeExp", color: "region" }}
  scales={scaleXLog10({ labels: "~s" })}
  key="country"
  inspect={{ mode: "xy", pin: true }}
  zoom={{ mode: "x" }}
  labs={{
    title: "Income and life expectancy",
    x: "GDP per capita (USD, log scale)",
    y: "Life expectancy (years)",
    color: "Region",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={3.5} />
  <GeomSmooth method="lm" se={false} />
</GGPlot>
