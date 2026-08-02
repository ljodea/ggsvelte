<script lang="ts">
  import {
    GeomLine,
    GeomRect,
    GGPlot,
    Labs,
    ScaleFillManual,
    ScaleXContinuous,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { reigns, wheatPrices } from "./data.js";
</script>

<GGPlot data={reigns} width={640} height={400}>
  <ThemeEconomist />
  <ScaleXContinuous labels="d" />
  <ScaleFillManual
    domain={["Monarchy", "Commonwealth"]}
    values={["#9ec3d6", "#e8a87c"]}
  />
  <Labs
    title="Background rectangles for eras"
    subtitle="Wheat prices with a band for each reign that covered those years"
    x="Year"
    y="Shillings per quarter"
    fill=""
  />
  <GeomRect
    aes={{
      xmin: "start",
      xmax: "end",
      ymin: "ymin",
      ymax: "ymax",
      fill: "rule",
      color: { value: "#ffffff" },
    }}
    alpha={0.55}
    linewidth={1}
  />
  <GeomLine
    data={wheatPrices}
    aes={{ x: "year", y: "shillings", color: { value: "#1a1a1a" } }}
    linewidth={2}
  />
</GGPlot>
