<script lang="ts">
  import { GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { longRunSeries } from "./data.js";
</script>

<GGPlot
  data={longRunSeries}
  aes={{ x: "year", y: "value" }}
  labs={{
    title: "Long-run index, 1835–2025",
    subtitle: "Raw four-digit strings infer a calendar scale",
    x: "Year",
    y: "Index",
  }}
  width="container"
  height={400}
>
  <GeomLine linewidth={1.5} />
</GGPlot>
