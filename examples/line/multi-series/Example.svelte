<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { wheatAndWages } from "./data.js";
</script>

<GGPlot
  data={wheatAndWages}
  aes={{ x: "year", y: "value", color: "series" }}
  theme="economist"
  scales={{
    x: { breaks: [1600, 1650, 1700, 1750, 1800], labels: "d", nice: false },
    color: {
      type: "manual",
      domain: ["Wheat price", "Weekly wage"],
      range: ["#ed111a", "#014d64"],
    },
  }}
  labs={{
    title: "Playfair's wheat and wages, 1565–1821",
    subtitle: "Shillings — the price swings, the wage only climbs",
    x: "Year",
    y: "Shillings",
    color: "Series",
  }}
  width={640}
  height={400}
>
  <GeomLine linewidth={2} />
  <GeomPoint size={1.6} />
</GGPlot>
