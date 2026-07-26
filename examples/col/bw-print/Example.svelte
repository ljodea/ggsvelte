<script lang="ts">
  import { GeomCol, GGPlot, Labs, ThemeBw } from "@ggsvelte/svelte";

  import { printCounts } from "./data.js";
</script>

<GGPlot
  data={printCounts}
  aes={{ x: "category", y: "n" }}
  width={640}
  height={400}
>
  <ThemeBw />
  <Labs
    title="theme_bw — print-friendly chrome"
    subtitle="White panel, grey grid, rectangular border"
    x="Category"
    y="Count"
  />
  <GeomCol />
</GGPlot>
