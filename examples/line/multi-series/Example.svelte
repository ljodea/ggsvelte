<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    GuideLegend,
    Inspect,
    Labs,
    ScaleColorManual,
    ScaleXContinuous,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { wheatAndWages } from "./data.js";
</script>

<GGPlot
  data={wheatAndWages}
  aes={{ x: "year", y: "value", color: "series" }}
  width={640}
  height={400}
>
  <Inspect mode="x" pin />
  <ThemeEconomist />
  <ScaleXContinuous
    breaks={[1600, 1650, 1700, 1750, 1800]}
    labels="d"
    nice={false}
  />
  <ScaleColorManual
    domain={["Wheat price", "Weekly wage"]}
    values={["#ed111a", "#014d64"]}
  />
  <Labs
    title="Two series on one panel"
    subtitle="Wheat price and a mechanic's weekly wage in shillings; the price swings, the wage climbs"
    x="Year"
    y="Shillings"
    color="Series"
  />
  <GuideLegend channel="color" focus />
  <GeomLine linewidth={2} />
  <GeomPoint size={1.6} />
</GGPlot>
