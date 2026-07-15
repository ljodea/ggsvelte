<script lang="ts">
  import { GeomArea, GGPlot } from "@ggsvelte/svelte";

  import { generation } from "./data.js";
</script>

<GGPlot
  data={generation}
  aes={{ x: "year", y: "twh", fill: "source" }}
  scales={{ x: { labels: "d", nice: false } }}
  labs={{
    title: "Electricity generation mix",
    x: "Year",
    y: "Generation (TWh)",
    fill: "Source",
  }}
  width={640}
  height={400}
>
  <GeomArea alpha={0.9} />
</GGPlot>
