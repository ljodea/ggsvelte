<script lang="ts">
  import { GeomLine, GeomRect, GGPlot } from "@ggsvelte/svelte";

  import { reigns, wheatPrices } from "./data.js";
</script>

<GGPlot
  data={reigns}
  theme="economist"
  scales={{
    x: { labels: "d" },
    fill: {
      type: "manual",
      domain: ["Monarchy", "Commonwealth"],
      range: ["#9ec3d6", "#e8a87c"],
    },
  }}
  labs={{
    title: "The price of wheat under twelve reigns",
    subtitle:
      "Playfair, 1821 — he drew the reigns on the chart because his argument was political",
    x: "Year",
    y: "Shillings per quarter",
    fill: "",
  }}
  width={640}
  height={400}
>
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
